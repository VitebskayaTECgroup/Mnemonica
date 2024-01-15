<%
	option explicit

	response.expires = 0
	response.expiresAbsolute = now() - 1
	response.write "try{Time='" & cstr(date) & " " & cstr(time) & "'}catch(e){};"

	dim tags, sql, conn, rs, i, value, name
	dim previousTag, currentTag, currentDate, currentValue

	dim dateStart, dateFinish

	tags = request.form("tag")
	if tags = "" then tags = request.queryString("tag")

	dateStart = request.form("dateStart")
	if dateStart = "" then dateStart = CStr(date())

	dateFinish = request.form("dateFinish")
	if dateFinish = "" then dateStart = CStr(date())

	previousTag = ""
	currentTag = ""
	
	if tags <> "" then
		tags = replace(tags, ",", """,""")

		sql = "SET QUOTED_IDENTIFIER OFF SELECT TagName, DateTime, vValue FROM v_History WHERE 	TagName IN (""" & tags & """) AND DateTime >= DateAdd(hh, -24, GetDate()) AND DateTime <= GetDate() ORDER BY TagName"

		set conn = server.createObject("ADODB.Connection")
		set rs = server.createObject("ADODB.Recordset")
		name = request.serverVariables("SERVER_NAME")

		if instr(name, "insql") > 0 then
			name = "localhost"
		else 
			name = "INSQL2"
		end if

		conn.commandTimeout = 120
		conn.open "Driver={SQL Server}; Server=" & name & "; Database=RUNTIME; Uid=wwuser; Pwd=wwuser;"

		response.write "try{empty=["

		rs.open sql, conn
		if rs.fields.count > 1 then
			while not rs.eof and i < 10000

				' Забираем данные из рекорд-сета
				currentTag = rs.fields(0)
				currentDate = rs.fields(1)
				currentValue = rs.fields(2)

				' Проверяем, изменилось ли имя тега, чтобы знать, когда заканчивать массив данных по этому тегу
				if currentTag <> previousTag then

					' Тег новый. Заканчиваем старый массив, начинаем новый. Чтобы код был одинаковый, первым массивом будет пустой массив-заглушка
					previousTag = currentTag
					response.write "]}catch(e){};"
					response.write "try{" & currentTag & "=["
				else
					response.write ","
				end if

				if isNull(value) then
					response.write "{d:'" & currentDate & "',v:''}"
				else
					if isNumeric(replace(value, ".", ",")) then
						response.write "{d:'" & currentDate & "',v:" & currentValue & "}"
					else
						response.write "{d:'" & currentDate & "',v:'" & currentValue & "'}"
					end if
				end if
				i = i + 1
				rs.moveNext
			wend
		end if

		response.write "]}catch(e){};"

		rs.close
		conn.close

		set rs = nothing
		set conn = nothing

	end if
%>