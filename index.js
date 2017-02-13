const cheerio = require('cheerio');
const request = require('request');
const base64 = require('node-base64-image');
const Twit = require('twit');
const json2csv = require('json2csv');
const _ = require('underscore');
const fs = require('fs');

var lookbook_url = 'http://www.supremenewyork.com/lookbook/22';
var interval = 1000; // 1 second
var products = [];

// Twitter API Config
var T = new Twit({
  consumer_key: 'consumer key goes here',
  consumer_secret: 'consumer secret goes here',
  access_token: 'access token goes here',
  access_token_secret: 'access token secret goes here'
})

var start = function(callback) {
  var loop = setInterval(function() {
    request({
      url: lookbook_url,
      method: 'get'
    }, function(err, res, body) {
      console.log(res.statusCode);
      if (res.statusCode === 404) {
        console.log('Page not found yet...');
      } else if (res.statusCode === 200) {
        console.log('Page found sending tweets...');
        clearInterval(loop);
        return callback(body)
      } else {
        console.log('Page not found yet...');
      }
    });
  }, interval);
}

start(function(body) {
  if (body) {
    var $ = cheerio.load(body);
    $('#lookbook-items ul li a').each(function(i, element) {
      var items = $(this).attr('data-caption');
      var $$ = cheerio.load(items);
      $$('a').each(function(i, element) {
        var data = {
          Name: $$(this).text(),
          Description: null,
          Link: 'http://www.supremenewyork.com' + $$(this).attr('href'),
          Image: null
        }
        request({
          url: data.Link,
          method: 'get'
        }, function(err, res, body) {
          var $ = cheerio.load(body)
          data.Image = 'http:' + $('#img-main').attr('src');
          data.Description = $('.description div p').text();
          console.log(data)
          var possibleDuplicate = _.findWhere(products, {
            Name: data.Name,
          });
          if (possibleDuplicate === undefined) {
            products.push(data)
          }
        });
      });
    });
    setTimeout(function() {
      console.log(products)
      var csv = json2csv({ data: products, fields: ['Name', 'Description', 'Link', 'Image'] });
      fs.writeFile('result.csv', csv, function(err) {
        if (err) throw err;
        console.log('writeFile successful');
        process.exit()
      });
    }, 10000);
  }
});

function postThree(image, title, desc, link) {
  console.log(image)
  base64.encode(image, {
    string: true
  }, function(err, img) {
    post(img, title)
  });
}

function post(base64, title) {
  console.log('base64', base64)
  console.log('title', title)
}
