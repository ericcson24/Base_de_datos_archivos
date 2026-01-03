function sendResponse(res, statusCode, data, notification = null) {
  const response = {
    ...data
  };
  
  if (notification) {
    response.notification = notification;
  }
  
  res.status(statusCode).json(response);
}

module.exports = { sendResponse };
