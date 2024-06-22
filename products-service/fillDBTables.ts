const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
import { Product } from './types/types';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const productsTableName = 'products_liza';
const stocksTableName = 'stocks_liza';

const products: Product[] = [
  {
    id: uuidv4(),
    title: "Abbey Road",
    description: "The Beatles' iconic 1969 album featuring hits like 'Come Together' and 'Here Comes The Sun'.",
    price: 25
  },
  {
    id: uuidv4(),
    title: "The Dark Side of the Moon",
    description: "Pink Floyd's classic 1973 album, known for its rich soundscapes and philosophical lyrics.",
    price: 30
  },
  {
    id: uuidv4(),
    title: "Thriller",
    description: "Michael Jackson's 1982 masterpiece, the best-selling album of all time.",
    price: 28
  },
  {
    id: uuidv4(),
    title: "Rumours",
    description: "Fleetwood Mac's 1977 hit album, featuring timeless tracks like 'Go Your Own Way' and 'Dreams'.",
    price: 22
  },
  {
    id: uuidv4(),
    title: "Back in Black",
    description: "AC/DC's 1980 rock album, a tribute to their former lead singer Bon Scott.",
    price: 24
  },
  {
    id: uuidv4(),
    title: "The Wall",
    description: "Another classic by Pink Floyd from 1979, a rock opera exploring themes of isolation.",
    price: 35
  },
  {
    id: uuidv4(),
    title: "Led Zeppelin IV",
    description: "Led Zeppelin's 1971 album featuring hits like 'Stairway to Heaven'.",
    price: 27
  },
  {
    id: uuidv4(),
    title: "Hotel California",
    description: "The Eagles' 1976 classic, known for its title track and 'New Kid in Town'.",
    price: 26
  },
  {
    id: uuidv4(),
    title: "Born to Run",
    description: "Bruce Springsteen's 1975 breakthrough album, featuring the title track and 'Thunder Road'.",
    price: 23
  }
];

const stocks = products.map(product => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 100) + 1
}));

const fillTables = async () => {
  try {
    for (const product of products) {
      await dynamoDb.put({
        TableName: productsTableName,
        Item: product
      }).promise();

      console.log(`Inserted product: ${product.title}`);
    }

    for (const stock of stocks) {
      await dynamoDb.put({
        TableName: stocksTableName,
        Item: stock
      }).promise();

      console.log(`Inserted stock for product_id: ${stock.product_id}`);
    }

    console.log('Tables filled with test data');
  } catch (err) {
    console.error('Error filling tables:', err);
  }
};

fillTables();
