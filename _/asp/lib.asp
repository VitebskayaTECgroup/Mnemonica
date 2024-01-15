<%
	option explicit

	function Auth()
		dim authorized, user

		authorized = "void crow ustinkov sova esmal"
		user = request.serverVariables("REMOTE_USER")
		user = lcase(user)
		user = replace(user, "vst\", "")

		Auth = instr(authorized, user) > 0
	end function
%>