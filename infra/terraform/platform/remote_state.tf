/*
 * Cross-stack read.
 *
 * Read-only by construction: a remote_state data source can consume another
 * stack's outputs but can never modify its resources. That is what lets the two
 * layers be applied, re-applied and destroyed independently - and it is why the
 * dependency runs one way only, platform -> cluster.
 *
 * The bucket reaches the stack's own backend through -backend-config, but a data
 * source needs it as an ordinary value, hence the state_bucket variable.
 */

data "terraform_remote_state" "cluster" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "cluster.tfstate"
    region = var.aws_region
  }
}
