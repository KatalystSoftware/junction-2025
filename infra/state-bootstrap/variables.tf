variable "project_id" {
  description = "GCP project ID where the state bucket will live"
  type        = string
}

variable "region" {
  description = "GCP region / location for the state bucket"
  type        = string
  default     = "europe-north1"
}

variable "state_bucket_name" {
  description = "Name of the GCS bucket to store Terraform state"
  type        = string
}
