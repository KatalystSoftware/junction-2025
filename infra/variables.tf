variable "project_id" {
  description = "GCP project ID (e.g. junkkari2025)"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run"
  type        = string
  default     = "europe-north1"
}

variable "container_image" {
  description = "Container image to deploy (e.g. nginx:stable-alpine)"
  type        = string
  default     = "nginx:stable-alpine"
}

variable "bastion_zone" {
  description = "GCE zone for bastion host"
  type        = string
  default     = "europe-north1-b"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "appdb"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  default     = "appuser"
}
