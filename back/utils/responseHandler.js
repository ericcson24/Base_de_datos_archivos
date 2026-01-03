const sendResponse = (res, statusCode, data = {}, notification = null) => {
  const response = {
    ...data
  };

  if (notification) {
    response.notification = {
      title: notification.title,
      message: notification.message,
      type: notification.type // 'success', 'error', 'info', 'warning'
    };
  }

  return res.status(statusCode).json(response);
};

module.exports = { sendResponse };
