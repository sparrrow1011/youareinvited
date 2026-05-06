import os
import logging
from typing import Dict, Tuple
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)


class TwilioWhatsAppSender:
    """Helper class to send WhatsApp messages via Twilio."""

    def __init__(self):
        """Initialize Twilio client with credentials from environment."""
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER')

        if not all([self.account_sid, self.auth_token, self.whatsapp_number]):
            raise ValueError(
                "Twilio credentials missing. Set TWILIO_ACCOUNT_SID, "
                "TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in .env"
            )

        self.client = Client(self.account_sid, self.auth_token)

    def send_whatsapp_message(
        self, to_phone_number: str, message: str
    ) -> Tuple[bool, Dict[str, str]]:
        """
        Send a WhatsApp message via Twilio.

        Args:
            to_phone_number: Recipient phone number in E.164 format (e.g., +1234567890)
            message: Message text to send

        Returns:
            Tuple of (success: bool, response: dict with 'sid' or 'error')
        """
        if not to_phone_number or not message:
            return False, {'error': 'Phone number and message are required.'}

        try:
            response = self.client.messages.create(
                from_=f"whatsapp:{self.whatsapp_number}",
                to=f"whatsapp:{to_phone_number}",
                body=message,
            )
            logger.info(f"WhatsApp message sent successfully to {to_phone_number}, SID: {response.sid}")
            return True, {'sid': response.sid}

        except TwilioRestException as e:
            error_msg = f"Failed to send WhatsApp to {to_phone_number}: {e.msg}"
            logger.error(error_msg)
            return False, {'error': error_msg}

        except Exception as e:
            error_msg = f"Unexpected error sending WhatsApp to {to_phone_number}: {str(e)}"
            logger.error(error_msg)
            return False, {'error': error_msg}
