/*
 * Production VPC for an EKS cluster.
 *
 *   Public subnets  -> internet-facing ALBs and NAT Gateways only
 *   Private subnets -> EKS worker nodes and every application pod
 *
 * Worker nodes have no public IP and no route from the internet. Their only
 * outbound path is through a NAT Gateway, which is what lets them pull images
 * from ECR and reach MongoDB Atlas while remaining unreachable from outside.
 */

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  /*
   * Address plan, for a /16 input such as 10.0.0.0/16:
   *
   *   private[i] = cidrsubnet(cidr, 2, i)                 -> 10.0.0.0/18, 10.0.64.0/18, 10.0.128.0/18
   *   public[i]  = cidrsubnet(<last /18>, 2, i)           -> 10.0.192.0/20, 10.0.208.0/20, 10.0.224.0/20
   *
   * Private subnets are deliberately enormous (~16k addresses each). With the
   * AWS VPC CNI every pod holds a real VPC IP, so a /24 private subnet runs out
   * of pods long before it runs out of nodes. Public subnets only ever hold ALB
   * and NAT interfaces, so a /20 is generous.
   */
  private_subnet_cidrs = [for i in range(var.az_count) : cidrsubnet(var.cidr_block, 2, i)]
  public_supernet      = cidrsubnet(var.cidr_block, 2, 3)
  public_subnet_cidrs  = [for i in range(var.az_count) : cidrsubnet(local.public_supernet, 2, i)]

  nat_gateway_count = var.single_nat_gateway ? 1 : var.az_count

  tags = merge(var.tags, {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  })
}

resource "aws_vpc" "this" {
  cidr_block = var.cidr_block

  # Required by EKS: nodes and the kubelet resolve each other by private DNS name.
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.tags, { Name = var.name })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-igw" })
}

# ---------------------------------------------------------------------------
# Public subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.tags, {
    Name = "${var.name}-public-${local.azs[count.index]}"

    # The AWS Load Balancer Controller looks for this exact tag when deciding
    # where to place an internet-facing ALB. Without it the Ingress reconciles
    # forever with "unable to discover at least one subnet" and no ALB appears.
    "kubernetes.io/role/elb" = "1"
  })
}

# ---------------------------------------------------------------------------
# Private subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  # No public IPs. This is the line that keeps worker nodes off the internet.
  map_public_ip_on_launch = false

  tags = merge(local.tags, {
    Name = "${var.name}-private-${local.azs[count.index]}"

    # Counterpart of the elb tag above, for internal load balancers.
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# ---------------------------------------------------------------------------
# NAT
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count = local.nat_gateway_count

  domain = "vpc"
  tags   = merge(var.tags, { Name = "${var.name}-nat-${count.index}" })

  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count = local.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, { Name = "${var.name}-nat-${count.index}" })

  depends_on = [aws_internet_gateway.this]
}

# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-public" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# One route table per private subnet, so that with per-AZ NAT each subnet egresses
# through the gateway in its own AZ. Cross-AZ NAT traffic is both slower and
# billed as inter-AZ transfer.
resource "aws_route_table" "private" {
  count = var.az_count

  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-private-${local.azs[count.index]}" })
}

resource "aws_route" "private_nat" {
  count = var.az_count

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[var.single_nat_gateway ? 0 : count.index].id
}

resource "aws_route_table_association" "private" {
  count = var.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ---------------------------------------------------------------------------
# Default security group lockdown
#
# AWS creates a default security group that allows all traffic between anything
# attached to it. Emptying its rules means that anything which accidentally lands
# on the default SG gets no connectivity, instead of silently getting everything.
# ---------------------------------------------------------------------------
resource "aws_default_security_group" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-default-do-not-use" })
}

# ---------------------------------------------------------------------------
# Flow logs (optional)
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name              = "/aws/vpc/${var.name}/flow-logs"
  retention_in_days = var.flow_log_retention_days

  tags = var.tags
}

data "aws_iam_policy_document" "flow_logs_assume" {
  count = var.enable_flow_logs ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
    ]
    resources = ["${aws_cloudwatch_log_group.flow_logs[0].arn}:*"]
  }
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name               = "${var.name}-flow-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume[0].json
  tags               = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name   = "flow-logs"
  role   = aws_iam_role.flow_logs[0].id
  policy = data.aws_iam_policy_document.flow_logs[0].json
}

resource "aws_flow_log" "this" {
  count = var.enable_flow_logs ? 1 : 0

  vpc_id          = aws_vpc.this.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn

  tags = var.tags
}
