# Connect Notion Docs to Claude

---

Reference: https://github.com/makenotion/notion-mcp-server

## 1. Use the Ready-Made Solution

1. **Set up Notion integration**

   - Go to https://www.notion.so/my-integrations, Create a new "Internal Integration", Give it a name, choose associated workspace, Type choose `Internal`, then `save`

     ![image-20251105161517911](https://raw.githubusercontent.com/DMGoose/Images/main/img/integrations-creation.png)

   - Click `Configure settings` -> Set Capabilities e.g."Read content"

   - Choose `Access` in the menu bar, edit access, set Page and database access

     > Alternatively, you can grant page access individually. You'll need to visit the target page in Notion, and click on the 3 dots, and select "Connect to integration".
     >
     > ![image-20251105161517910](https://raw.githubusercontent.com/DMGoose/Images/main/img/connections.png)

   - After finish, Copy the `Internal Integration Secret` in Configuration, then click `save`

2. **Install the MCP server**

   - Run: `npx @notionhq/notion-mcp-server`

3. **Connect it to Claude Desktop**

   - Download Claude Desktop, open it -> Settings -> Developer -> Local MCP servers -> click Configure 

   - Edit Claude Desktop's config file (`claude_desktop_config.json`) and save

     ```json
        {
          "mcpServers": {
            "notion": {
              "command": "npx",
              "args": ["-y", "@notionhq/notion-mcp-server"],
              "env": {
                "NOTION_TOKEN": "your-Internal-Integration-Secret"
              }
            }
          }
        }
     ```

4. **Restart Claude Desktop**

5. **Test it**

   > - Open Claude Desktop
   > - Check tools (check search and tools button on chat page or Local MCP servers in settings -> developer)
   > - Ask Claude to search your Notion docs
   > - Verify it can read the pages you shared

**Expected outcome:** Claude can now answer questions using our Notion docs.

## 2. Build Custom MCP Server

Reference: 

> [Build an MCP server - Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server#node)
> [Notion API Overview](https://developers.notion.com/docs/getting-started)

More info in: README.MD