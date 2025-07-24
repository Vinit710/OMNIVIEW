fetch("http://127.0.0.1:5000/api/status")
  .then(res => res.json())
  .then(data => {
    document.getElementById("status").innerText = data.status;
  })
  .catch(err => {
    document.getElementById("status").innerText = "Backend not responding.";
    console.error(err);
  });
