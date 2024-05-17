// async function temp() {
//   const res = await fetch("https://api.github.com/users/goutamdogri");
// 	const data = await res.json()
// 	document.querySelector(".box").innerHTML = data.login;
// 	console.log(data);
// }

// // temp()

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("userForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    // Convert the FormData object to a plain object
    const formObject = {};
    formData.forEach((value, key) => {
      formObject[key] = value;
    });
    console.log(formObject);

    fetch("http://localhost:8000/api/v1/users/register", {
      method: "POST",
      body: formData,
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
