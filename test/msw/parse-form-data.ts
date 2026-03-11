/**
 * Parses an incoming `msw` request object's form data payload to a JavaScript object.
 * @param request The request.
 * @returns The parsed body.
 */
export async function parseFormData(
  request: Request,
): Promise<Record<string, string>> {
  const formData = await request.formData();
  const body: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    body[key] = typeof value === 'string' ? value : value.name;
  }
  return body;
}
