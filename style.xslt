<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html>
      <head>
        <title>Index of <xsl:value-of select="/html/body/h1" /></title>
        <style>
          body {
            font-family: sans-serif;
            background-color: #1a1a1a;
            color: #f2f2f2;
            margin: 0;
            padding: 2em;
          }
          h1 {
            text-align: center;
            color: #f2f2f2;
          }
          table {
            width: 80%;
            margin: 1em auto;
            border-collapse: collapse;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #333;
          }
          tr:hover {
            background-color: #444;
          }
          a {
            color: #61dafb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1><xsl:value-of select="/html/body/h1" /></h1>
        <table>
          <tr>
            <th>Name</th>
            <th>Last Modified</th>
            <th>Size</th>
          </tr>
          <xsl:for-each select="/html/body/pre/a">
            <tr>
              <td>
                <a>
                  <xsl:attribute name="href">
                    <xsl:value-of select="@href"/>
                  </xsl:attribute>
                  <xsl:value-of select="."/>
                </a>
              </td>
              <td><xsl:value-of select="substring-after(following-sibling::text()[1], ' ')" /></td>
              <td><xsl:value-of select="substring-after(substring-after(following-sibling::text()[1], ' '), ' ')" /></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>