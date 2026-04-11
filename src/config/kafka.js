import { Kafka, logLevel } from 'kafkajs';
import logger from '../utils/logger.js';
import env    from './env.js';

const kafka = new Kafka({
  clientId: env.kafka.clientId,
  brokers:  env.kafka.brokers,
  logLevel: logLevel.WARN,
});

let producer = null;

export const getProducer = async () => {
  if (producer) return producer;

  producer = kafka.producer({
    retry:                  { retries: 5 },
    allowAutoTopicCreation: true,
  });

  await producer.connect();
  logger.info('Kafka producer connected');
  return producer;
};

export const getConsumer = async (groupId) => {
  const consumer = kafka.consumer({
    groupId: groupId || env.kafka.groupId,
  });

  await consumer.connect();
  logger.info(`Kafka consumer connected (group: ${groupId || env.kafka.groupId})`);
  return consumer;
};

export const disconnectKafka = async () => {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
    producer = null;
  }
};

export { kafka };
