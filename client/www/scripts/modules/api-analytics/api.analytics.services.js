ApiAnalytics.service('ApiAnalyticsService', [
  '$http',
  '$log',
  '$q',
  function($http, $log, $q) {
    var svc = this;
    var Client = require('strong-mesh-models').Client;
    var client;

    svc.getClient = function(host, port){
      if ( client ) return client;

      client = new Client('http://' + host + ':' + port);

      return client;
    };

    svc.getDailySummary = function(d, i, depth, server, initialModel){
      var def = $q.defer();
      var client = svc.getClient(server.host, server.port);

      client.dailyExpressMetricsSummary(function(err, res){
        if ( err ) return def.reject(err);

        var chartData = {
          name: "flare",
          children: []
        };

        //convert data to d3 chart data
        Object.keys(res).map(function(item){
          chartData.children.push({
            name: item,
            size: res[item],
            orig: item
          });
        });

        def.resolve(chartData);
      });


      return def.promise;
    };

    svc.getHourlySummary = function(d, i, depth, server, initialModel){
      var def = $q.defer();
      var client = svc.getClient(server.host, server.port);
      var modelName = d.name;

      client.hourlyExpressMetricsSummary(modelName, function(err, res){
        if ( err ) return def.reject(err);

        var hourly = res;
        var chartData = {
          name: "flare",
          children: []
        };

        hourly.map(function(item){
          var total = item.GET + item.POST + item.PUT + item.DELETE;
          var obj = {
            name: moment(item.timeStamp).format('ha'),
            size: total,
            orig: item
          };

          chartData.children.push(obj);
        });

        def.resolve(chartData);
      });

      return def.promise;
    };

    svc.getEndpointDetail = function(d, i, depth, server, initialModel){
      var def = $q.defer();
      var client = svc.getClient(server.host, server.port);
      var modelName = initialModel;
      var timeStamp = new Date(d.orig.timeStamp);

      client.expressMetricsEndpointDetail(modelName, timeStamp, function(err, res) {
        if (err) return def.reject(err);

        var endpoints = res;
        var chartData = {
          name: "flare",
          children: []
        };

        endpoints.map(function(item){
          var obj = {
            name: item.requestUrl,
            size: item.responseDuration,
            orig: item
          };

          chartData.children.push(obj);
        });

        def.resolve(chartData);
      });

      return def.promise;
    };

    svc.getApiAnalyticsChartDataByNode = function(d, i, depth, server, initialModel) {
      if ( depth === 0 ) {
        return svc.getDailySummary(d, i, depth, server, initialModel);
      } else if ( depth === 1 ) {
        return svc.getHourlySummary(d, i, depth, server, initialModel);
      } else if ( depth === 2 ) {
        return svc.getEndpointDetail(d, i, depth, server, initialModel);
      }
    };

    return svc;
  }]);
