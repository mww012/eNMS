from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from os import environ


class Config(object):

    # SQL Alchemy
    SQLALCHEMY_DATABASE_URI = environ.get(
        'ENMS_DATABASE_URL',
        'sqlite:///database.db?check_same_thread=False'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # AP Scheduler
    JOBS = []
    SCHEDULER_JOBSTORES = {
        'default': SQLAlchemyJobStore(url='sqlite:///flask_context.db')
    }
    SCHEDULER_API_ENABLED = True
    SCHEDULER_EXECUTORS = {
        'default': {
            'type': 'threadpool',
            'max_workers': 500
        }
    }

    # WebSSH (GoTTY)
    GOTTY_PORT_REDIRECTION = False
    GOTTY_SERVER_ADDR = environ.get('GOTTY_SERVER_ADDR', None)


class DebugConfig(Config):
    DEBUG = True
    SECRET_KEY = environ.get('ENMS_SECRET_KEY', 'get-a-real-key')


class ProductionConfig(Config):
    DEBUG = False
    # In production, the secret MUST be provided as an environment variable.
    SECRET_KEY = environ.get('ENMS_SECRET_KEY')

    # Vault
    # In production, all credentials (hashes, usernames and passwords) are
    # stored in a vault.
    # There MUST be a Vault configured to use eNMS in production mode.
    VAULT_ADDR = environ.get('VAULT_ADDR')
    VAULT_TOKEN = environ.get('VAULT_TOKEN')
    UNSEAL_VAULT = False
    UNSEAL_VAULT_KEY1 = environ.get('UNSEAL_VAULT_KEY1', None)
    UNSEAL_VAULT_KEY2 = environ.get('UNSEAL_VAULT_KEY2', None)
    UNSEAL_VAULT_KEY3 = environ.get('UNSEAL_VAULT_KEY3', None)
    UNSEAL_VAULT_KEY4 = environ.get('UNSEAL_VAULT_KEY4', None)
    UNSEAL_VAULT_KEY5 = environ.get('UNSEAL_VAULT_KEY5', None)

    # GoTTY
    GOTTY_PORT_REDIRECTION = True


class SeleniumConfig(Config):
    DEBUG = True
    SECRET_KEY = 'key'
    TESTING = True
    LOGIN_DISABLED = True


config_dict = {
    'Production': ProductionConfig,
    'Debug': DebugConfig,
    'Selenium': SeleniumConfig
}
