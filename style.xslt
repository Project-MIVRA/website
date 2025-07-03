<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html>
      <head>
        <title>Index of <xsl:value-of select="/html/body/h1" /></title>
        <style>
            body {
                background-image: url('Assets/Mini-background.avif');
                background-repeat: no-repeat;
                background-attachment: fixed;
                background-position: center;
                background-size: cover;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                padding: 20px;
                margin: 0;
            }
            h1 {
                color: white;
                text-align: center;
            }

            .box {
                background-color: #000000a0;
                border: 2px solid #3367e1;
                border-radius: 10px;
                color: #fff;
                padding: 20px;
                margin-bottom: 20px;
            }

            .main {
                width: 90%;
                max-width: 1200px;
            }

            .wishlist-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
                list-style: none;
                padding: 0;
            }

            .wishlist-item {
                background-color: #000000a0;
                border: 2px solid #3367e1;
                border-radius: 10px;
                overflow: hidden;
                transition: transform 0.2s ease-in-out;
                color: #fff;
            }

            .wishlist-item:hover {
                transform: translateY(-5px);
            }

            .wishlist-item a {
                text-decoration: none;
                color: inherit;
                display: block;
            }

            .wishlist-item img {
                width: 100%;
                height: auto;
                display: block;
                aspect-ratio: 1 / 1;
                object-fit: cover;
            }

            .item-info {
                padding: 15px;
                text-align: center;
            }

            .item-title {
                font-weight: bold;
                font-size: 1.1em;
                color: royalblue;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
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