function testDoPost() {
  const sampleEvent = {
    postData: {
      contents: JSON.stringify({
        message: {
          chat: { id: CONFIG.MY_CHAT_ID },
          text: "1000 compras prex",
          date: Math.floor(Date.now() / 1000)
        }
      })
    }
  };
  doPost(sampleEvent);
}