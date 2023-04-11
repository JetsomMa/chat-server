// 验证跨域的请求样例
fetch('http://localhost:3000/api/createChatCompletion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "prompt": "切换到中关村西区", "conversationId": "", "userName": "Jetsom"
  })
}).then(response => {
  if (response.ok) {
    return response.json();
  } else {
    throw new Error('Network response was not ok.');
  }
}).then(data => {
  console.log(data);
})