const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const verifyGoogleIdToken = async (idToken) => {
  if (!client) {
    const error = new Error('Google sign-in is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (verificationError) {
    const audienceMismatch = /audience|recipient|authorized party/i.test(verificationError.message || '');
    const error = new Error(audienceMismatch
      ? 'Google sign-in is misconfigured. The frontend and backend must use the same Google OAuth Web client ID.'
      : 'Google could not verify this sign-in. Check that the production storefront origin is authorized in Google Cloud and try again.');
    error.statusCode = 401;
    error.apiCode = audienceMismatch ? 'GOOGLE_CLIENT_ID_MISMATCH' : 'GOOGLE_TOKEN_VERIFICATION_FAILED';
    throw error;
  }

  const payload = ticket.getPayload();
  if (
    !payload
    || typeof payload.sub !== 'string'
    || typeof payload.email !== 'string'
    || payload.email_verified !== true
  ) {
    const error = new Error('Google sign-in requires a verified email address.');
    error.statusCode = 401;
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : payload.email.trim(),
  };
};

module.exports = { verifyGoogleIdToken };
