<%
	dim json, dir, id, path, fs, f

	json = request.form
	dir = request.serverVariables("HTTP_REFERER")
	id = request.queryString("id")
	dir = split(dir, "/")
	path = Replace(Request.ServerVariables("PATH_TRANSLATED"), "\_\asp\saver.asp", "\" & dir(ubound(dir) - 1) & "\" & id & ".html")

	set fs = Server.CreateObject("Scripting.FileSystemObject")
	set f = fs.CreateTextFile(path, true)
	f.write(json)
	f.close

	set f = nothing
	set fs = nothing
%>