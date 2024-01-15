<%
	option explicit

	response.expires = 0
	response.expiresAbsolute = now() - 1
	response.write "try{Time='" & cstr(date) & " " & cstr(time) & "'}catch(e){};"

	dim tags, sql, conn, rs, i, value

	tags = request.form("tag")
	if tags = "" then tags = request.queryString("tag")
	
	if tags <> "" then
		tags = replace(tags, ",", """,""")

		sql = "SET QUOTED_IDENTIFIER OFF SELECT TagName, vValue FROM v_Live WHERE TagName IN (""" & tags & """)"

		set conn = server.createObject("ADODB.Connection")
		set rs = server.createObject("ADODB.Recordset")

		dim name
		if instr(name, "insql") > 0 then
			name = "localhost"
		else 
			name = "INSQL2"
		end if

		conn.commandTimeout = 120
		conn.open "Driver={SQL Server}; Server=" & name & "; Database=RUNTIME; Uid=wwuser; Pwd=wwuser;"

		rs.open sql, conn
		if rs.fields.count > 1 then
			while not rs.eof and i < 1000
				value = rs.fields(1)
				if isNull(value) then
					response.write "try{" & rs.fields(0) & "=''}catch(e){}"
				else
					if isNumeric(replace(value, ".", ",")) then
						response.write "try{" & rs.fields(0) & "=" & value & "}catch(e){}"
					else
						response.write "try{" & rs.fields(0) & "='" & value & "'}catch(e){}"
					end if
				end if
				i = i + 1
				rs.moveNext
			wend
		end if

		rs.close
		conn.close

		set rs = nothing
		set conn = nothing

	end if
%>