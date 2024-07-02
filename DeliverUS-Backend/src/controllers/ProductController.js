import { Product, Order, Restaurant, RestaurantCategory, ProductCategory } from '../models/models.js'
import Sequelize from 'sequelize'

const indexRestaurant = async function (req, res) {
  try {
    const products = await Product.findAll({
      where: {
        restaurantId: req.params.restaurantId
      },
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    })
    res.json(products)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of products
  try {
    const product = await Product.findByPk(req.params.productId, {
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    }
    )
    res.json(product)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  let newProduct = Product.build(req.body)
  try {
    // SOLUCION
    updateEconomic(newProduct.restaurantId)
    newProduct = await newProduct.save()
    res.json(newProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}
/*

Un restaurante será económico si, una vez se dé de alta un producto del mismo, el precio medio de los productos del mismo
 sea menor que el precio medio de los productos del resto de restaurantes.
Nota1: Para hacer un filtrado de productos cuyo restaurante sea distinto del restaurante actual puede usar el operador not
equal (Sequelize.Op.ne)
*/
// SOLUCION
const updateEconomic = async function (RestaurantId) {
  const AvgPriceOtherRestaurants = Product.findAll(
    {
      where: { restaurantId: { [Sequelize.Op.ne]: RestaurantId } },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']
      ]
    }
  )
  const AvgPriceMyRestaurant = Product.findOne({
    where: { restaurantId: RestaurantId },
    attributes: [
      [Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']
    ]
  })
  const restaurant = await Restaurant.findByPk(RestaurantId)
  if (AvgPriceMyRestaurant !== null && AvgPriceOtherRestaurants !== null) {
    restaurant.economic = AvgPriceMyRestaurant.avgPrice < AvgPriceOtherRestaurants.avgPrice
  }
  await restaurant.save()
}

const update = async function (req, res) {
  try {
    await Product.update(req.body, { where: { id: req.params.productId } })
    const updatedProduct = await Product.findByPk(req.params.productId)
    res.json(updatedProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Product.destroy({ where: { id: req.params.productId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted product id.' + req.params.productId
    } else {
      message = 'Could not delete product.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const popular = async function (req, res) {
  try {
    const topProducts = await Product.findAll(
      {
        include: [{
          model: Order,
          as: 'orders',
          attributes: []
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId'],
          include:
        {
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }
        }
        ],
        attributes: {
          include: [
            [Sequelize.fn('SUM', Sequelize.col('orders.OrderProducts.quantity')), 'soldProductCount']
          ],
          separate: true
        },
        group: ['orders.OrderProducts.productId'],
        order: [[Sequelize.col('soldProductCount'), 'DESC']]
      // limit: 3 //this is not supported when M:N associations are involved
      })
    res.json(topProducts.slice(0, 3))
  } catch (err) {
    res.status(500).send(err)
  }
}

const ProductController = {
  indexRestaurant,
  show,
  create,
  update,
  destroy,
  popular
}
export default ProductController
