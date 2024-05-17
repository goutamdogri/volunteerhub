document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("userFormLogin");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    // Convert the FormData object to a plain object
    const formObject = {};
    formData.forEach((value, key) => {
      formObject[key] = value;
    });
    console.log(formObject);

    fetch("http://localhost:8000/api/v1/users/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(formObject),
			credentials: "include",
		})
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
      })
			.then(() => window.location.href = "http://127.0.0.1:5500/backend/frontend/static/html/home.html")
      .catch((error) => {
        console.error("Error:", error);
      });
  });
});