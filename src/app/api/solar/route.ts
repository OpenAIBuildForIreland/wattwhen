import { readHousehold } from "@/lib/households";
import { solarYear } from "@/lib/solarYear";
export async function POST(request:Request) {
  try{const body=await request.json();return Response.json(await solarYear(readHousehold(body.household),body.sample===true));}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid request'},{status:400});}
}
