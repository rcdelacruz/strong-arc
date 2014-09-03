// Copyright StrongLoop 2014
Discovery.controller('DiscoveryMainController', [
  '$scope',
  'ModelService',
  '$timeout',
  '$rootScope',
  'DiscoveryService',
  'PropertyService',
  'IAService',
  '$q',
  function($scope, ModelService, $timeout, $rootScope, DiscoveryService, PropertyService, IAService, $q) {

    $scope.isDsTablesLoadingIndicatorVisible = true;
    $scope.currentDiscoveryStep = 'selectSourceTables';
    $scope.showDiscoveryBackButton = false;
    $scope.tableSelections = []; // note also used to disable wizard buttons
    $scope.targetTables = [];
    $scope.masterSelectedProperties = []; // collection of selected property collections
    $scope.targetGenerateSrcTables = [];  // selected tables from the schema
    $scope.isDsTableGridVisible = false;

    $scope.filterOptions = {
      filterText: ''
    };

    $scope.schemaSrcTables = [];

    // discovery wizard form
    var dsName = $scope.targetDiscoveryDSName;
    if (dsName) {
      $scope.schemaSrcTables = DiscoveryService.getSchemaDataFromDatasource(dsName).
        then(function(schemaData) {
          $scope.schemaSrcTables = schemaData;  // trigger the grid display
          $scope.isDsTableGridVisible = true;
          $scope.isDsTablesLoadingIndicatorVisible = false;
        });
    }

    $scope.isSchemaModelComposerVisible = function(){
      return $scope.targetGenerateSrcTables.length > 0;
    };

    // next click
    $scope.discoveryNexBtnClicked = function() {
      $scope.targetTables = $scope.dsTablesGridOptions.selectedItems;
      $scope.isDsTableGridVisible = false;

      switch($scope.currentDiscoveryStep) {

        // initial step show the output from the 'get schema' call on the ds
        case 'initialSchemaView':

          $scope.currentDiscoveryStep = 'selectSourceTables';
          $scope.showDiscoveryBackButton = false;

          break;

        // user has selected at least one source table
        case 'selectSourceTables':
          $scope.isDsTablesLoadingIndicatorVisible = true;
          DiscoveryService.getModelsFromSchemaSelections(dsName, $scope.targetTables).
            then(function(response) {
              $scope.targetGenerateSrcTables = response;
              $scope.isDsTablesLoadingIndicatorVisible = false;
            });
          $scope.currentDiscoveryStep = 'confirmAndCreateModels';
          $scope.showDiscoveryBackButton = true;
          break;

        // Generate the definitions
        case 'confirmAndCreateModels':
          // reset wizard step
          $scope.currentDiscoveryStep = 'initialSchemaView';
          $scope.showDiscoveryBackButton = true;
          $scope.targetGenerateSrcTables.map(function(table, index) {

          table.facetName = CONST.NEW_MODEL_FACET_NAME;
          var dSource = dsName.split('.')[1];
          var instance = {
            name: table.name,
            definition: table,
            type: CONST.MODEL_TYPE,
            config: {
              dataSource: dSource
            }
          };

          // generate the model instance
          ModelService.createModelInstance(instance).
            then(function(instance) {
              var modelId = instance.id;

              // create properties
              var propertiesCollection = [];
              var selectedProperties = $scope.masterSelectedProperties[index];
              var selectedPropNames = [];
              for (var i = 0;i < selectedProperties.length;i++) {
                selectedPropNames.push(selectedProperties[i].name);
                var targetProperty = selectedProperties[i];
                targetProperty.modelId = modelId;
                targetProperty.facetName = CONST.NEW_MODEL_FACET_NAME;
                if(targetProperty.id) {
                  targetProperty.isId = true;
                }
                propertiesCollection.push(PropertyService.createModelProperty(targetProperty).
                  then(function(property){
                    return property;
                  }).
                  catch(function(error) {
                    console.warn('property not created: ' + error);
                    return error;
                  })
                );
              }

              $q.all(propertiesCollection)
                .then(function(response) {
                  instance.properties = response;
                  IAService.addInstanceRef(instance);
                  IAService.setActiveInstance(instance);
                  $rootScope.$broadcast('newSchemaModelsEvent', {});
                }).
                catch(function(error) {
                  console.warn('bad q.all model properties: ' + error);
                });
              }
            );
          });
          // kill the modal
          $scope.cancel();

          break;

        default:

      }
    };

    $scope.discoveryBackBtnClicked = function() {
      $scope.targetGenerateSrcTables = [];
      $scope.isDsTableGridVisible = true;

      switch($scope.currentDiscoveryStep) {
        case 'initialSchemaView':

          break;

        case 'selectSourceTables':
          $scope.currentDiscoveryStep = 'initialSchemaView';
          $scope.showDiscoveryBackButton = false;

          break;

        case 'confirmAndCreateModels':
          $scope.currentDiscoveryStep = 'selectSourceTables';
          $scope.showDiscoveryBackButton = false;

          break;

        default:

      }
    };


    // source schema grid config
    $scope.dsTablesGridOptions = {
      data: 'schemaSrcTables',
      columnDefs: [
        {field:'name', displayName:'Table'},
        {field:'owner',displayName:'Owner'}
      ],
      checkboxHeaderTemplate: '<input class="ngSelectionHeader" type="checkbox" ng-model="allSelected" ng-change="toggleSelectAll(allSelected)"/>',
      checkboxCellTemplate: '<label class="select-item-cell"><span class="sl-icon sl-icon-checkmark"></span><input type="checkbox" /></label>',
      showSelectionCheckbox: true,
      selectWithCheckboxOnly: false,
      selectedItems:  $scope.tableSelections,
      multiSelect: true,
      filterOptions: $scope.filterOptions
    };

  }
]);
