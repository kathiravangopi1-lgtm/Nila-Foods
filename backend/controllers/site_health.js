const pingServer = (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is up and running.' });
};

module.exports = { pingServer };