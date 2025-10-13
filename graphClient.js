const axios = require('axios');
const config = require('../config/microsoft');

class GraphClient {
  constructor(msalClient, session) {
    this.msalClient = msalClient;
    this.session = session;
  }

  async callApi(endpoint, params = {}) {
    try {
      const response = await this._makeApiCall(endpoint, params);
      return response;
    } catch (error) {
      if (error.response?.status === 401 || error.errorCode === 'no_tokens_found') {
        // Redirige o lanza error para que el frontend muestre el botón de login
        throw new Error('REAUTH');
      }
      throw error;
    }
  }

  async _getAccessTokenSilently() {
    if (!this.session.account) {
      throw new Error('No account information available');
    }
    
    try {
      const result = await this.msalClient.acquireTokenSilent({
        account: this.session.account,
        scopes: ['Calendars.Read', 'Calendars.ReadWrite', 'User.Read', 'offline_access']
      });
      
      // Update session with new tokens
      this.session.accessToken = result.accessToken;
      this.session.tokenExpires = new Date(result.expiresOn).getTime();
      
      return result;
    } catch (error) {
      console.error('Silent token acquisition failed:', error);
      throw error;
    }
  }

  async _makeApiCall(endpoint, params) {
    if (this._isTokenExpired()) {
      await this._getAccessTokenSilently();
    }

    const url = `https://graph.microsoft.com/v1.0${endpoint}`;
    console.log('Making API call to:', url);
    
    return axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.session.accessToken}`,
        'Prefer': 'outlook.timezone="UTC"'
      },
      params
    });
  }

  _isTokenExpired() {
    return !this.session.tokenExpires || Date.now() >= this.session.tokenExpires - 300000;
  }
}

module.exports = GraphClient;