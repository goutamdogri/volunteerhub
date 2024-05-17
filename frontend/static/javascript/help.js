document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("helpForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    // Convert the FormData object to a plain object
    const formObject = {};
    formData.forEach((value, key) => {
      formObject[key] = value;
    });
    console.log(formObject);
console.log(document.cookie);
    fetch("http://localhost:8000/api/v1/helpReq/addHelpReq", {
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
      .catch((error) => {
        console.error("Error:", error);
      });
  });
});