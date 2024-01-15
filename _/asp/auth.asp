<!--#include file="lib.asp"-->
<%
	dim a
	a = Auth()

	if a then response.write "{""done"":true}" else response.write "{}"
%>