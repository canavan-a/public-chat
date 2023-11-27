# Deployment is on lightsail

Push local image to lightsail:

aws lightsail push-container-image --region us-east-1 --service-name public-chat-live --label public-chat-v6 --image public-chat:latest