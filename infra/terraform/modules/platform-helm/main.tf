/*
 * Cluster platform components.
 *
 * THE BOUNDARY THIS MODULE DEFINES
 *
 *   Terraform owns the platform: the load balancer controller, ArgoCD itself,
 *   monitoring and metrics-server. These are cluster infrastructure, they change
 *   rarely, and ArgoCD cannot install ArgoCD.
 *
 *   ArgoCD owns the application: the namespace, Deployments, Services, Ingress,
 *   HPA and ServiceMonitor under k8s/. These change on every merge.
 *
 *   Nothing appears on both sides. Two controllers reconciling the same object is
 *   how you get a resource that flips between two states forever, and it is the
 *   most common way a "GitOps" setup ends up not being one.
 *
 * All values are supplied through `values = [yamlencode(...)]` rather than `set`
 * blocks: it round-trips complex structures correctly and reads like the chart's
 * own values.yaml.
 */

locals {
  # Namespaces this module creates via the charts' own createNamespace behaviour.
  alb_namespace             = "kube-system"
  argocd_namespace          = "argocd"
  monitoring_namespace      = "monitoring"
  alb_service_account       = "aws-load-balancer-controller"
  common_chart_timeout_secs = 900
}

# ---------------------------------------------------------------------------
# AWS Load Balancer Controller
#
# Watches Ingress objects and provisions the real ALB, target groups, listeners
# and rules. This is the component that turns the Kubernetes Ingress in the
# k8s/ directory of this repository into actual AWS infrastructure.
# ---------------------------------------------------------------------------
module "alb_controller_irsa" {
  source = "../irsa"

  name              = "${var.cluster_name}-alb-controller"
  description       = "AWS Load Balancer Controller for ${var.cluster_name}"
  oidc_provider_arn = var.oidc_provider_arn
  oidc_provider_url = var.oidc_provider_url
  namespace         = local.alb_namespace
  service_accounts  = [local.alb_service_account]

  # The upstream policy, vendored at a known version rather than hand-written.
  # It is long, but every statement is one the controller genuinely calls, and
  # hand-trimming it is how people end up with an ALB that half-provisions.
  inline_policy_json = file("${path.module}/policies/aws-load-balancer-controller.json")

  tags = var.tags
}

resource "helm_release" "alb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = var.alb_controller_chart_version
  namespace  = local.alb_namespace

  timeout = local.common_chart_timeout_secs
  wait    = true

  values = [yamlencode({
    clusterName = var.cluster_name
    region      = var.region
    vpcId       = var.vpc_id

    serviceAccount = {
      create = true
      name   = local.alb_service_account
      annotations = {
        "eks.amazonaws.com/role-arn" = module.alb_controller_irsa.role_arn
      }
    }

    # Two replicas so an ALB reconcile is not blocked by a single pod restart.
    replicaCount = 2

    resources = {
      requests = { cpu = "100m", memory = "128Mi" }
      limits   = { memory = "256Mi" }
    }

    # Exposes controller metrics to the Prometheus stack below.
    serviceMonitor = {
      enabled   = var.enable_monitoring
      namespace = local.monitoring_namespace
    }
  })]
}

# ---------------------------------------------------------------------------
# ArgoCD
#
# Installed by Terraform because it is the thing that does the deploying; it
# cannot bootstrap itself. From here on, ArgoCD owns application state and this
# module never touches an application resource.
# ---------------------------------------------------------------------------
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_chart_version
  namespace        = local.argocd_namespace
  create_namespace = true

  timeout = local.common_chart_timeout_secs
  wait    = true

  values = [yamlencode({
    global = {
      domain = "argocd.${var.cluster_name}.internal"
    }

    configs = {
      params = {
        # The API server is not exposed through an Ingress. Access is via
        # `kubectl port-forward`, which keeps the control plane of the delivery
        # system off the public internet. Insecure mode is safe only because of
        # that: TLS is not terminated here, and nothing reaches it externally.
        "server.insecure" = true
      }
      cm = {
        # Prune and self-heal are configured per Application, not globally, so
        # production can differ from dev.
        "timeout.reconciliation" = "180s"
      }
    }

    controller = {
      replicas = 1
      resources = {
        requests = { cpu = "250m", memory = "512Mi" }
        limits   = { memory = "1Gi" }
      }
      metrics = {
        enabled = var.enable_monitoring
        serviceMonitor = {
          enabled   = var.enable_monitoring
          namespace = local.monitoring_namespace
        }
      }
    }

    repoServer = {
      replicas = 1
      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { memory = "1Gi" }
      }
      metrics = {
        enabled = var.enable_monitoring
        serviceMonitor = {
          enabled   = var.enable_monitoring
          namespace = local.monitoring_namespace
        }
      }
    }

    server = {
      replicas = 1
      resources = {
        requests = { cpu = "100m", memory = "128Mi" }
        limits   = { memory = "512Mi" }
      }
      metrics = {
        enabled = var.enable_monitoring
        serviceMonitor = {
          enabled   = var.enable_monitoring
          namespace = local.monitoring_namespace
        }
      }
    }

    applicationSet = {
      replicas = 1
    }

    # Single non-HA Redis. ArgoCD's Redis is a cache of rendered manifests, not a
    # datastore: if it is lost, ArgoCD re-renders from Git. Nothing is at risk,
    # so paying for a three-node HA Redis in a dev cluster buys nothing.
    redis-ha = {
      enabled = false
    }
  })]
}

# ---------------------------------------------------------------------------
# metrics-server
#
# Supplies `kubectl top` and, more importantly, the resource metrics the
# HorizontalPodAutoscaler reads. Without it an HPA sits at <unknown>/70%.
# ---------------------------------------------------------------------------
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  version    = var.metrics_server_chart_version
  namespace  = "kube-system"

  timeout = local.common_chart_timeout_secs
  wait    = true

  values = [yamlencode({
    resources = {
      requests = { cpu = "50m", memory = "64Mi" }
      limits   = { memory = "128Mi" }
    }
  })]
}

# ---------------------------------------------------------------------------
# kube-prometheus-stack
#
# Prometheus, Grafana, Alertmanager, kube-state-metrics and node-exporter.
# Between them they cover the saturation and cluster-health signals; latency,
# traffic and error rate come from the backend's own /metrics endpoint, scraped
# through a ServiceMonitor that ships with the application in k8s/base.
# ---------------------------------------------------------------------------
resource "helm_release" "kube_prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0

  depends_on = [
    kubernetes_storage_class_v1.gp3
  ]

  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.kube_prometheus_stack_chart_version
  namespace        = local.monitoring_namespace
  create_namespace = true

  # The stack installs a large set of CRDs and takes a while on a cold cluster.
  timeout = 1800
  wait    = true

  values = [yamlencode({
    prometheus = {
      prometheusSpec = {
        retention = var.prometheus_retention

        # Empty selectors mean "watch every namespace". Without this the
        # application's own ServiceMonitor, which lives in its own namespace and
        # is deployed by ArgoCD, would be ignored.
        serviceMonitorSelectorNilUsesHelmValues = false
        podMonitorSelectorNilUsesHelmValues     = false
        ruleSelectorNilUsesHelmValues           = false

        resources = {
          requests = { cpu = "250m", memory = "1Gi" }
          limits   = { memory = "2Gi" }
        }

        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "gp3"
              accessModes      = ["ReadWriteOnce"]
              resources        = { requests = { storage = var.prometheus_storage_size } }
            }
          }
        }
      }
    }

    grafana = {
      # No Ingress: reached with `kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80`.
      # An internet-facing Grafana is a genuine attack surface and is not needed
      # to satisfy the observability requirement.
      ingress = { enabled = false }

      persistence = {
        enabled          = true
        storageClassName = "gp3"
        size             = var.grafana_storage_size
      }

      resources = {
        requests = { cpu = "100m", memory = "128Mi" }
        limits   = { memory = "256Mi" }
      }

      # Picks up any ConfigMap labelled grafana_dashboard=1, which is how the
      # application's dashboard arrives from k8s/monitoring, synced by ArgoCD.
      sidecar = {
        dashboards = {
          enabled         = true
          label           = "grafana_dashboard"
          labelValue      = "1"
          searchNamespace = "ALL"
        }
      }
    }

    alertmanager = {
      alertmanagerSpec = {
        resources = {
          requests = { cpu = "50m", memory = "128Mi" }
          limits   = { memory = "256Mi" }
        }
      }
    }

    # EKS runs the control plane, so these components are not visible to scrape.
    # Leaving them enabled produces permanently red targets that train people to
    # ignore red targets.
    kubeControllerManager = { enabled = false }
    kubeScheduler         = { enabled = false }
    kubeEtcd              = { enabled = false }
    kubeProxy             = { enabled = false }
  })]
}
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
  }

  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true

  parameters = {
    type = "gp3"
  }
}
