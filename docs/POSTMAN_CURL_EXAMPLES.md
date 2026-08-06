# API Reference, cURL & Postman Examples

## 1. cURL Request Example

Execute this command in your terminal to test report generation against a running server:

```bash
curl --request POST \
  --url http://localhost:3000/api/v1/inspection-reports/generate \
  --header "Authorization: Bearer YOUR_SECURE_API_KEY" \
  --header "Idempotency-Key: HSC1-4106-20260402" \
  --form 'metadata={
    "reportId":"HSC1-4106-20260402",
    "templateId":"lower-hebel-site-check-1",
    "reportTitle":"Site Check 1 Inspection",
    "reportType":"Lower Hebel Installation",
    "builder":"BOLD",
    "checkDate":"02/04/2026",
    "property":{
      "fullAddress":"Lot 4106 Heathcote Circuit, REDLAND BAY 4165"
    },
    "responses":{
      "powerInstalled":"Completed",
      "sarkingInstalled":"Partially Completed",
      "zeroBoundaryInstallation":"Cannot Install"
    },
    "options":{
      "maximumPdfSizeMb":20
    }
  };type=application/json' \
  --form "images=@./path/to/inspection-photo-01.jpg" \
  --form "images=@./path/to/inspection-photo-02.jpg"
```

---

## 2. Direct Binary PDF Download cURL

Request binary stream response directly:

```bash
curl --request POST \
  --url "http://localhost:3000/api/v1/inspection-reports/generate?format=binary" \
  --header "Authorization: Bearer YOUR_SECURE_API_KEY" \
  --header "Accept: application/pdf" \
  --form 'metadata={"reportId":"HSC1-4106-20260402","templateId":"lower-hebel-site-check-1","property":{"fullAddress":"Lot 4106 Heathcote Circuit, REDLAND BAY 4165"}}' \
  --form "images=@./path/to/photo.jpg" \
  --output "generated_report.pdf"
```

---

## 3. Postman Collection Format

Save the following JSON into a file named `Inspection_Report_API.postman_collection.json` and import into Postman:

```json
{
  "info": {
    "name": "Site Inspection PDF Generator API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate PDF Report (Multipart)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer YOUR_SECURE_API_KEY", "type": "text" },
          { "key": "Idempotency-Key", "value": "HSC1-4106-20260402", "type": "text" }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "metadata",
              "value": "{\"reportId\":\"HSC1-4106-20260402\",\"templateId\":\"lower-hebel-site-check-1\",\"reportTitle\":\"Site Check 1 Inspection\",\"reportType\":\"Lower Hebel Installation\",\"builder\":\"BOLD\",\"checkDate\":\"02/04/2026\",\"property\":{\"fullAddress\":\"Lot 4106 Heathcote Circuit, REDLAND BAY 4165\"},\"responses\":{\"powerInstalled\":\"Completed\",\"sarkingInstalled\":\"Partially Completed\",\"zeroBoundaryInstallation\":\"Cannot Install\"}}",
              "type": "text"
            },
            {
              "key": "images",
              "type": "file",
              "src": []
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/v1/inspection-reports/generate",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "v1", "inspection-reports", "generate"]
        }
      }
    }
  ]
}
```
