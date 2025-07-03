<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:D="DAV:" exclude-result-prefixes="D">
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>

    <xsl:template match="D:multistatus">
        <xsl:text disable-output-escaping="yes">&lt;?xml version="1.0" encoding="utf-8" ?&gt;</xsl:text>
        <D:multistatus xmlns:D="DAV:">
            <xsl:copy-of select="*"/>
        </D:multistatus>
    </xsl:template>

    <xsl:template match="/list">
      <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;</xsl:text>
      <html>
        <head>
            <meta charset="UTF-8"/>
            <title>Index</title>
            
            <link rel="stylesheet" type="text/css" href="/style.css"/>
            
            <script src="https://kit.fontawesome.com/55eb9c16a8.js"></script>

            <script type="text/javascript"><![CDATA[
                document.addEventListener('DOMContentLoaded', function(){ 

                    function calculateSize(size) {
                        if (!size || size == '0') return '-';
                        var sufixes = ['B', 'KB', 'MB', 'GB', 'TB'];
                        var q = 0;
                        while (size >= 1024 && q < sufixes.length - 1) {
                            size /= 1024;
                            q++;
                        }
                        return (Math.round(size * 100) / 100) + ' ' + sufixes[q];
                    }
            
                    if (window.location.pathname === '/') {
                        var goUpLink = document.querySelector('.directory.go-up');
                        if(goUpLink) goUpLink.style.display = 'none';
                    }

                    var path = window.location.pathname.split('/');
                    var nav = document.querySelector("nav#breadcrumbs ul");
                    var pathSoFar = '';
                
                    for (var i = 1; i < path.length; i++) {
                        if(path[i] === '') continue;
                        var decodedPart = decodeURI(path[i]);
                        pathSoFar += '/' + decodedPart;
                        nav.innerHTML += '<li><a href="' + encodeURI(pathSoFar)  + '">' + decodedPart + '</a></li>';
                    }

                    document.querySelectorAll("td.mtime[data-mtime]").forEach(el => {
                        var d = new Date(el.dataset.mtime);
                        el.textContent = d.toLocaleString();
                    });

                    document.querySelectorAll("td.size[data-size]").forEach(el => {
                        el.textContent = calculateSize(parseInt(el.dataset.size));
                    });
                
                });
            ]]></script>

            <script type="text/javascript"><![CDATA[
                document.addEventListener("DOMContentLoaded", function() {

                    function parseHttpHeaders(headers) {
                        return headers.split("\n").filter(Boolean).map(x=>x.split(/: */,2)).reduce((ac, x)=>{ac[x[0].toLowerCase()] = x[1];return ac;}, {});
                    }

                    var xhr = new XMLHttpRequest();
                    xhr.open('OPTIONS', document.location.href, true);
                    xhr.send(null);
                    xhr.addEventListener('readystatechange', function() {
                        if (xhr.readyState == 4 && !xhr.getResponseHeader('DAV')) {
                            document.body.classList.add('nowebdav');
                        }
                    });
            
                    var dropArea = document.getElementById('droparea');
                    var progressWin = document.getElementById('progresswin');
                    var progressBar = document.getElementById('progressbar');
                    var progressTrack = [];
                    var totalFiles = 0;
            
                    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                        dropArea.addEventListener(eventName, e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }, false);
                    });

                    ['dragenter', 'dragover'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight')));
                    ['dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight')));

                    document.querySelectorAll('a[data-action="delete"]').forEach(el => {
                        el.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Delete ' + el.dataset.href + '?')) {
                                deleteFile(el.dataset.href);
                            }
                        });
                    });

                    dropArea.addEventListener('drop', function(e) {
                        var files = e.dataTransfer.files;
                        if(files.length === 0) return;

                        totalFiles = files.length;
                        progressTrack = Array(files.length).fill({ value: 0 });
                        var totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);
                        
                        progressBar.value = 0;
                        progressBar.max = totalSize;
                        progressWin.classList.add('show');

                        Array.from(files).forEach((file, i) => uploadFile(file, i));
                    });

                    function updateProgress(value, idx) {
                        progressTrack[idx].value = value;
                        progressBar.value = progressTrack.reduce((acc, item) => acc + item.value, 0);
                    }

                    function uploadFile(file, idx) {
                        var xhr = new XMLHttpRequest();
                        var targetUrl = window.location.href.endsWith('/') ? window.location.href : window.location.href + '/';
                        xhr.open('PUT', targetUrl + file.name, true);
                        xhr.upload.addEventListener("progress", e => updateProgress(e.loaded, idx));
                        xhr.addEventListener('readystatechange', function() {
                            if (xhr.readyState == 4) {
                                totalFiles--;
                                if (xhr.status < 200 || xhr.status >= 300) alert(`Upload failed for ${file.name}: ${xhr.statusText}`);
                                if (totalFiles == 0) document.location.reload();
                            }
                        });
                        xhr.send(file);
                    }

                    function deleteFile(path) {
                        var xhr = new XMLHttpRequest();
                        var targetUrl = window.location.href.endsWith('/') ? window.location.href : window.location.href + '/';
                        xhr.open('DELETE', targetUrl + path, true);
                        xhr.addEventListener('readystatechange', function() {
                            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 204)) {
                                document.location.reload();
                            } else if (xhr.readyState == 4) {
                                alert(`Delete failed for ${path}: ${xhr.statusText}`);
                            }
                        });
                        xhr.send();
                    }
                });
            ]]></script>

            <style type="text/css"><![CDATA[
                /* --- CORRECTED STYLES --- */
                body {
                    background-image: url('/Assets/Mini-background.avif');
                    background-repeat: no-repeat;
                    background-attachment: fixed;
                    background-position: center;
                    background-size: cover;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    /* Added these to match index.html */
                    align-items: center;
                    min-height: 100vh;
                    padding: 20px;
                    margin: 0;
                }

                /* This is the key change to match the width of your main page's box */
                .box {
                    background-color: #000000a0;
                    border: 2px solid #3367e1;
                    border-radius: 10px;
                    color: #fff;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                /* --- END OF CORRECTIONS --- */

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
                td.size, td.mtime {
                    color: #aaa;
                    text-align: right;
                }

                /* Styles for new features */
                nav#breadcrumbs { margin-bottom: 30px; display: flex; justify-content: center; align-items: center; }
                nav#breadcrumbs ul { list-style: none; display: inline-block; margin: 0; padding: 0; }
                nav#breadcrumbs ul li { float: left; }
                nav#breadcrumbs ul li a { color: #FFF; display: block; background: #515151; text-decoration: none; position: relative; height: 40px; line-height: 40px; padding: 0 10px 0 25px; text-align: center; margin-right: 23px; }
                nav#breadcrumbs ul li:first-child a { padding-left: 15px; }
                nav#breadcrumbs ul li a:before, nav#breadcrumbs ul li a:after { content: ""; position: absolute; top: 0; border: 0 solid #515151; border-width: 20px 10px; width: 0; height: 0; }
                nav#breadcrumbs ul li a:before { left: -20px; border-left-color: transparent; }
                nav#breadcrumbs ul li a:after { left: 100%; border-color: transparent; border-left-color: #515151; }
                nav#breadcrumbs ul li a:hover { background-color: #6a6a6a; }
                nav#breadcrumbs ul li a:hover:before, nav#breadcrumbs ul li a:hover:after { border-color: #6a6a6a; border-left-color: transparent; }
                nav#breadcrumbs ul li a:hover:after { border-left-color: #6a6a6a; }
                
                td.icon { width: 1px; padding-right: 5px; }
                td.icon i { color: #FBDD7C; }
                tr.go-up td.icon i { color: #BF8EF3; }
                td.actions { width: 1px; }
                td.actions ul { list-style: none; margin: 0; padding: 0; visibility: hidden; }
                tr:hover td.actions ul { visibility: visible; }
                td.actions ul li a { font-size: 16px; }
                td.actions ul li a[data-action='delete']:hover { color: #ff6b6b !important; text-decoration: none; }
                
                div#droparea { border: 3px dashed transparent; border-radius: 15px; padding: 20px; transition: border-color 0.3s; width:100%; }
                div#droparea.highlight { border-color: #f0f0f0; }
                
                div#progresswin { position: fixed; display: none; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center; }
                div#progresswin.show { display: flex; }
                div#progresswin progress { width: 50%; }

                body.nowebdav #droparea { border: none !important; }
                body.nowebdav td.actions { display: none; }
            ]]></style>
        </head>
        <body>
            <div id="droparea">
                <div id="progresswin"><progress id="progressbar"></progress></div>
                <div class="box">
                    <nav id="breadcrumbs">
                        <ul><li><a href="/"><i class="fa fa-home"></i></a></li></ul>
                    </nav>
                    <table>
                        <thead>
                            <tr>
                                <th class="icon"></th>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Date Modified</th>
                                <th class="actions"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="directory go-up">
                                <td class="icon"><a href=".."><i class="fa fa-arrow-up"></i></a></td>
                                <td><a href="..">..</a></td>
                                <td class="size"></td>
                                <td class="mtime"></td>
                                <td class="actions"></td>
                            </tr>
                            <xsl:for-each select="/list/directory">
                                <tr class="directory">
                                    <td class="icon"><a href="{.}/"><i class="fa fa-folder"></i></a></td>
                                    <td><a href="{.}/"><xsl:value-of select="."/></a></td>
                                    <td class="size"></td>
                                    <td class="mtime" data-mtime="{@mtime}"></td>
                                    <td class="actions"></td>
                                </tr>
                            </xsl:for-each>
                            <xsl:for-each select="/list/file">
                                <tr class="file">
                                    <td class="icon"><a href="{.}"><i class="fa fa-file"></i></a></td>
                                    <td><a href="{.}"><xsl:value-of select="."/></a></td>
                                    <td class="size" data-size="{@size}"></td>
                                    <td class="mtime" data-mtime="{@mtime}"></td>
                                    <td class="actions">
                                        <ul><li><a href="#" data-action="delete" data-href="{.}"><i class="fa fa-trash"></i></a></li></ul>
                                    </td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
      </html>
    </xsl:template>
</xsl:stylesheet>