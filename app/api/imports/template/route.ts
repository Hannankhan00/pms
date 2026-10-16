import { NextResponse } from "next/server";
import { ImportEntity } from "@prisma/client";
import { createCsvResponse } from "@/lib/utils/csv-exporter";
import { createErrorResponse } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

const TEMPLATES: Record<ImportEntity, { filename: string; content: string }> = {
  [ImportEntity.MEDICINE]: {
    filename: "medicine_import_template.csv",
    content:
      "sku,name,category,strength,unitOfMeasure,minStockLevel,maxStockLevel,reorderPoint,isControlled,regulatorySchedule,isNarcotic,requiresPrescription\r\n" +
      "MED-AMOX-500,Amoxicillin 500mg,Antibiotics,500mg,CAPSULE,50,500,100,false,,false,true\r\n" +
      "MED-OXY-010,Oxycodone 10mg,Analgesics,10mg,TABLET,20,200,40,true,Schedule II,true,true\r\n" +
      "MED-PARA-500,Paracetamol 500mg,Analgesics,500mg,TABLET,100,2000,200,false,,false,false\r\n",
  },
  [ImportEntity.SUPPLIER]: {
    filename: "supplier_import_template.csv",
    content:
      "name,contactPerson,email,phone,address,taxNumber\r\n" +
      "Apex Pharmaceuticals,John Doe,contact@apexpharma.com,+1-555-0192,100 Pharma Blvd Suite 4,TAX-US-99210\r\n" +
      "BioMed Logistics,Sarah Connor,orders@biomed.com,+1-555-0843,42 Distribution Way,TAX-US-11029\r\n",
  },
  [ImportEntity.CUSTOMER]: {
    filename: "customer_import_template.csv",
    content:
      "name,phone,email,address,creditLimit\r\n" +
      "City Health Clinic,+1-555-3341,billing@cityclinic.org,742 Evergreen Terrace,5000.00\r\n" +
      "St. Jude Outpatient,+1-555-9081,accounts@stjude.org,12 Medical Center Dr,10000.00\r\n",
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity")?.toUpperCase() as ImportEntity;

  if (!entity || !TEMPLATES[entity]) {
    const error = createErrorResponse(
      `Invalid entity template requested. Available: ${Object.keys(TEMPLATES).join(", ")}`
    );
    return NextResponse.json(error.body, { status: 400 });
  }

  const template = TEMPLATES[entity];
  return createCsvResponse(template.content, template.filename);
}
