# Adding New Inspection Templates

The PDF Generator system is fully template-driven. Adding new inspection types (e.g. `final-installation-check` or `roof-framing-check`) requires **no code changes** to the PDF rendering engine or API.

---

## 1. Create JSON Template Configuration File

Add a new JSON file inside `src/config/inspection-templates/<templateId>.json`.

Example: `src/config/inspection-templates/final-installation-check.json`

```json
{
  "templateId": "final-installation-check",
  "title": "Final Hebel Installation Check",
  "version": "1.0.0",
  "description": "Final quality assurance inspection template",
  "sections": [
    {
      "id": "final-coating-sealant",
      "title": "Coating & Sealant Inspection",
      "questions": [
        {
          "id": "coating-applied",
          "label": "Is the Hebel base coat and texture coat fully applied?",
          "responseKey": "coatingApplied"
        },
        {
          "id": "expansion-joints",
          "label": "Are control/expansion joints sealed with polyurethane backing rod & sealant?",
          "responseKey": "expansionJointsSealed"
        }
      ]
    }
  ]
}
```

---

## 2. Dynamic Answer Mapping

In your Make.com or API metadata payload, specify the `templateId` and pass column answers in the `responses` object matching your template `responseKey`s:

```json
{
  "templateId": "final-installation-check",
  "responses": {
    "coatingApplied": "Completed",
    "expansionJointsSealed": "Correct"
  }
}
```

---

## 3. Template Question Properties

Each question object in a section supports:
* `id` (string, required): Unique question identifier.
* `label` (string, required): Exact question text to display on the PDF.
* `responseKey` (string, required): Key used to find answer in `metadata.responses`.
* `type` (optional): `"choice"` | `"text"` | `"notes"` | `"number"`.
* `isFullWidth` (optional boolean): When `true`, renders full-width block below question label instead of 2-column badge layout (ideal for notes/comments).
