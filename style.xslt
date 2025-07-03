<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" doctype-system="about:legacy-compat" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        <html>
            <head>
                <meta charset="UTF-8"/>
                <title>Index of <xsl:value-of select="/directory/@path"/></title>
                <link rel="stylesheet" type="text/css" href="/style.css"/>
                <style>
                    body {
                        background-image: url('/Assets/Error.avif');
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
                    .main {
                        width: 90%;
                        max-width: 1200px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        padding: 10px 15px;
                        border-bottom: 1px solid #333;
                        text-align: left;
                    }
                    th {
                        background-color: #2a2a2a;
                    }
                    td a {
                        color: #f2f2f2;
                        text-decoration: none;
                        font-weight: bold;
                    }
                    td a:hover {
                        text-decoration: underline;
                    }
                    .size, .date {
                        color: #aaa;
                    }
                </style>
            </head>
            <body>
                <div class="main">
                    <div class="box">
                        <h1>Index of <xsl:value-of select="/directory/@path"/></h1>
                        <table>
                            <tr>
                                <th>Name</th>
                                <th class="size">Size</th>
                                <th class="date">Last Modified</th>
                            </tr>
                            <xsl:if test="/directory/@path != '/'">
                                <tr>
                                    <td><a href="..">../</a></td>
                                    <td class="size">-</td>
                                    <td class="date">-</td>
                                </tr>
                            </xsl:if>
                            <xsl:apply-templates select="/directory/file"/>
                        </table>
                    </div>
                </div>
            </body>
        </html>
    </xsl:template>

    <xsl:template match="file">
        <tr>
            <td>
                <a>
                    <xsl:attribute name="href">
                        <xsl:value-of select="@name"/>
                    </xsl:attribute>
                    <xsl:value-of select="@name"/>
                </a>
            </td>
            <td class="size">
                <xsl:value-of select="@size"/>
            </td>
            <td class="date">
                <xsl:value-of select="@mtime"/>
            </td>
        </tr>
    </xsl:template>

</xsl:stylesheet>