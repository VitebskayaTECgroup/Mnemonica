<%
	option explicit

	dim user

	user = request.serverVariables("REMOTE_USER")
	user = lcase(user)
	user = replace(user, "vst\", "")

	response.write user
%>