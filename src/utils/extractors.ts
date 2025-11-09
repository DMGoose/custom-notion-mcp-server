export function extractTitle(page: any): string {
  if ("properties" in page && page.properties) {
    const titleProp = Object.values(page.properties).find(
      (prop: any) => prop.type === "title" && prop.title?.length
    );
    if (titleProp && (titleProp as any).title?.[0]?.plain_text)
      return (titleProp as any).title[0].plain_text;
  }
  return "Untitled";
}

export const notionUrl = (id: string) => `https://www.notion.so/${id.replace(/-/g, "")}`;
