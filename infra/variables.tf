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
