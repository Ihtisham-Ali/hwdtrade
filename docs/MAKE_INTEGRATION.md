# Make.com Integration & Scenario Setup Guide

This guide details how to integrate **Monday.com** with the **Modern Site Inspection PDF Generator** using **Make.com**.

---

## Architecture Overview

```text
Monday.com Item Trigger
    ↓
1. Monday.com — Get an Item (Fetches item ID, property address, check date, builder name)
    ↓
2. Monday.com GraphQL — Get File Assets (Retrieves file column asset IDs & URLs)
    ↓
3. Iterator — Process Each File
    ↓
4. HTTP — Get a File (Downloads binary content for each inspection photo)
    ↓
5. Array Aggregator — Collect Downloaded Files
    ↓
6. HTTP — Make a Request (POST multipart/form-data to PDF Generator API)
    ↓
7. Monday.com — Upload File (Uploads generated PDF back to Monday.com file column)
```

---

## Detailed Make.com Module Configuration

### Module 1: Monday.com — Get an Item
* **Board**: Select your Inspection Board (e.g. `Site Checks Board`).
* **Item ID**: Map from trigger or webhook item ID.
* **Fields to Retrieve**:
  * Item Name / Report Title
  * Property Address (Text or Location Column)
  * Builder Name (Status / Dropdown Column)
  * Check Date (Date Column)
  * Inspection Type (Text / Dropdown)
  * File Column (Files attached by site supervisors)

---

### Module 2: Monday.com — Execute GraphQL Query (Get Assets)
* **Query**:
  ```graphql
  query {
    items (ids: [{{1.id}}]) {
      assets {
        id
        name
        public_url
        file_size
      }
    }
  }
  ```

---

### Module 3: Iterator
* **Array**: `{{2.body.data.items[].assets}}`

---

### Module 4: HTTP — Get a File
* **URL**: `{{3.public_url}}`
* **Method**: `GET`
* **Response Handling**: Return Binary File Content.

---

### Module 5: Array Aggregator
* **Source Module**: Iterator
* **Target structure**: Aggregated files array.

---

### Module 6: HTTP — Make a Request (Primary API Call)

#### Request Setup
* **URL**: `https://your-deployment-domain.com/api/v1/inspection-reports/generate`
* **Method**: `POST`
* **Body Type**: `multipart/form-data`
* **Headers**:
  * `Authorization`: `Bearer YOUR_SECURE_API_KEY`
  * `Idempotency-Key`: `HSC1-{{1.id}}`

#### Multipart Body Fields

##### Field 1 (Text / JSON): `metadata`
* **Field Name**: `metadata`
* **Field Type**: Text / Stringified JSON
* **Value**:
  ```json
  {
    "reportId": "HSC1-{{1.id}}",
    "templateId": "lower-hebel-site-check-1",
    "reportTitle": "{{1.name}}",
    "reportType": "Lower Hebel Installation",
    "builder": "{{1.builder_column}}",
    "checkDate": "{{1.date_column}}",
    "property": {
      "fullAddress": "{{1.address_column}}"
    },
    "inspector": {
      "name": "Site Inspector",
      "company": "Wilkinson Planning"
    },
    "responses": {
      "powerInstalled": "{{1.power_column}}",
      "sarkingInstalled": "{{1.sarking_column}}",
      "zeroBoundaryInstallation": "{{1.zero_boundary_column}}"
    },
    "generalNotes": [
      "{{1.notes_column}}"
    ]
  }
  ```

##### Field 2 (File / Binary, Repeated): `images`
* **Field Name**: `images`
* **Field Type**: File
* **File Data**: `{{5.array[].data}}`
* **File Name**: `{{5.array[].name}}`

---

### Module 7: Monday.com — Upload File to Item
* **Item ID**: `{{1.id}}`
* **Column ID**: `files` (or `inspection_pdf`)
* **File Source**: Data returned from HTTP module (`6.data` / PDF binary).

---

## Best Practices & Troubleshooting
1. **No Base64 Required**: Always pass binary streams directly in multipart file fields.
2. **Idempotency**: Set `Idempotency-Key` to item ID to prevent duplicate generation during Make.com scenario retries.
3. **Array Aggregator**: Ensure the aggregator output maps each binary item into the repeated `images` field.
