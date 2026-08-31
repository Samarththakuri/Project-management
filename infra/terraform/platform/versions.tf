terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.38"
    }
  }

  backend "s3" {
    key          = "platform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Stack       = "platform"
    }
  }
}

/*
 * Kubernetes and Helm providers.
 *
 * Configured from the cluster stack's remote state, so the endpoint and CA are
 * already-known values before this stack plans. That is precisely why the two
 * layers are separate states: if the cluster were created in this same apply,
 * these values would be unknown at plan time and Terraform would refuse with
 * "provider configuration depends on resource attributes that cannot be
 * determined until apply".
 *
 * `exec` shells out to `aws eks get-token` for a fresh token on every operation.
 * A static token would be written into state and would expire 15 minutes later.
 */
provider "kubernetes" {
  host                   = data.terraform_remote_state.cluster.outputs.cluster_endpoint
  cluster_ca_certificate = base64decode(data.terraform_remote_state.cluster.outputs.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks", "get-token",
      "--cluster-name", data.terraform_remote_state.cluster.outputs.cluster_name,
      "--region", var.aws_region,
    ]
  }
}

provider "helm" {
  kubernetes = {
    host                   = data.terraform_remote_state.cluster.outputs.cluster_endpoint
    cluster_ca_certificate = base64decode(data.terraform_remote_state.cluster.outputs.cluster_certificate_authority_data)

    exec = {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks", "get-token",
        "--cluster-name", data.terraform_remote_state.cluster.outputs.cluster_name,
        "--region", var.aws_region,
      ]
    }
  }
}
