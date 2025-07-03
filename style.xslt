<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" doctype-system="about:legacy-compat" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        <html>
            <head>
                <meta charset="UTF-8"/>
                <title>Index of <xsl:value-of select="name(//directory)"/></title>
                <link rel="stylesheet" type="text/css" href="/style.css"/>
                <style>
                    body {
                        background-image: url('/Assets/Mini-background.avif');
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
                        <h1>Index of <xsl:value-of select="name(//directory)"/></h1>
                        <table>
                            <tr>
                                <th>Name</th>
                                <th style="text-align: right;">Size</th>
                                <th style="text-align: right;">Date Modified</th>
                            </tr>
                            <xsl:for-each select="/list/*">
                                <xsl:sort select="@mtime" order="descending"/>

                                <xsl:variable name="name" select="."/>
                                <xsl:variable name="is-dir" select="substring(@name, string-length(@name)) = '/'"/>

                                <xsl:variable name="size-formatted">
                                    <xsl:choose>
                                        <xsl:when test="$is-dir">-</xsl:when>
                                        <xsl:when test="number(@size) &gt; 1048576">
                                            <xsl:value-of select="format-number(@size div 1048576, '0.00')"/>M
                                        </xsl:when>
                                        <xsl:when test="number(@size) &gt; 1024">
                                            <xsl:value-of select="format-number(@size div 1024, '0.0')"/>K
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:value-of select="@size"/>B
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>

                                <xsl:variable name="date-formatted">
                                     <xsl:if test="not($is-dir)">
                                        <xsl:value-of select="substring-after(@mtime, ', ')"/>
                                     </xsl:if>
                                </xsl:variable>

                                <tr>
                                    <td><a href="{$name}"><xsl:value-of select="$name"/></a></td>
                                    <td class="size"><xsl:value-of select="$size-formatted"/></td>
                                    <td class="date"><xsl:value-of select="$date-formatted"/></td>
                                </tr>
                            </xsl:for-each>
                        </table>
                    </div>
                </div>
            </body>
        </html>
    </xsl:template>

</xsl:stylesheet>