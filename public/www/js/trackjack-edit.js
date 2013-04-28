"use strict";

function onDeviceReadyEdit() {
  console.log("onDeviceReadyEdit");
  $("#location").text(window.isphone ? "Phone" : "Not Phone");
  // change this to your server's IP
  // var host = "http://127.0.0.1:3000";
  var host = "http://trackserver-test.herokuapp.com";
  var currentPoint = {};
  var currentEditPointIndex = 0;
  var mediaFiles = {};
  var currentEditingTour = {};
  var newTour = {};
  var currentEditingPoint = {};

  $("#editTrackListPage").on('pagebeforeshow', getTourList);
  $("#editTrackLoadingPage").on('pagebeforeshow', loadMediaItems);
  $("#editTrackInfoPage1").on('pagebeforeshow', populateTrackInfoPage1);
  $("#editTrackInputPage2").on('pagebeforeshow', populateTrackInfoPage2);
  $("#editTrackPOIListPage").on('pagebeforeshow', populatePointList);
  $("#editTrackPOIInfoPage1").on('pagebeforeshow', populatePointInfoPage1);
  $("#editTrackInfoDelete").click(deleteTrack);
  $("#editTrackInfoUploadImageLibrary").click(saveCoverImageFromLibrary);
  $("#editTrackInfoUploadImageCamera").click(saveCoverImageFromCamera);
  $("#editTrackPOIUploadImageLibrary").click(savePointImageFromLibrary);
  $("#editTrackPOIUploadImageCamera").click(savePointImageFromCamera);
  $("#editTrackPOISubmit").click(uploadNewPointData);
  $("#editTrackRecordAudio").click(recordPointAudio);
  $("#editTrackInfoSave").click(uploadTourMetadata);


  function deleteTrack(event) {
    event.preventDefault();
    console.log("deleteTrack");
    alert("Deleting tracks isn't supported yet.");
  }

  //dupe of trackjack-view.js. should package these.


  function getTourList() {
    console.log("getTourList");
    $(".viewTrackListDiv").hide();
    $("#editTrackListLoading").show();
    currentEditPointIndex = 0;

    var callData = {
      type: "GET",
      path: "/tours.json"
    };
    makeAPICall(callData, showTourList);
  }


  function showTourList(response) {
    console.log("showTourList");
    $("#editTrackListLoading").hide();
    var $tourTemplate = $("#editTrackListItemTemplate").clone(false);
    $("#editTrackList").children().remove('li');
    // console.log($tourTemplate);
    for (var i = 0; i < response.length; i++) {
      var $tourListEntry = $tourTemplate.clone(false);
      var $viewTrackTitle = $tourListEntry.find(".viewTrackTitle");
      $viewTrackTitle.text(response[i].name);
      var $viewTrackDifficulty = $tourListEntry.find(".viewTrackDifficulty");
      $viewTrackDifficulty.text(response[i].difficulty);
      var $viewTrackDistance = $tourListEntry.find(".viewTrackDistance");
      $viewTrackDistance.text(((response[i].tour_length) * 0.000621371192).toFixed(2));
      $tourListEntry.find(".viewTrackChapters").text(response[i].chapters.length + " chapters");
      console.log(response[i].fullitem);
      if (response[i].fullitem != "/cover_images/original/missing.png") {
        $tourListEntry.find(".editTrackListImage").attr("src", response[i].fullitem);
      }

      //TODO: figure out why jqmdata doesn't work
      $tourListEntry.data("tourid", response[i].id);
      //console.log($tourListEntry);
      $("#editTrackList").append($tourListEntry);
    }
    // class for tours in selectable list.
    // tour id should be in 'data-tourid' attribute
    $(".viewTrackListItem").click(function(event) {
      var tourid = $(this).data('tourid');
      moveToTourInfo(tourid);
    });
    $tourTemplate.remove();
    $('.viewTrackListDiv').show();
    $('#editTrackList').listview('refresh');


  }

  function moveToTourInfo(tourid) {
    console.log("moveToTourInfo");
    var callData = {
      type: "GET",
      path: "/tours/" + tourid + ".json"
    };
    makeAPICall(callData, function(response) {
      currentEditingTour = response;
      console.log(response);
      $.mobile.changePage($("#editTrackLoadingPage"), {
        transition: "slide"
      });
    });
  }

  function loadMediaItems() {
    // load all of the media items, then continue
    // make an array of download functions, then call async.parallel on it
    var mediaTaskArray = [];

    // TODO: this won't work if any interp_point has no media items.
    console.log(currentEditingTour);
    $.each(currentEditingTour.interest_points, function(index, interest_point) {
      $.each(interest_point.interp_items, function(index, interp_item) {
        $.each(interp_item.media_items, function(index, media_item) {
          var mediaTask = function(media_item) {
            return function(callback) {
              var callData = {
                type: "GET",
                path: "/media_items/" + media_item.id + ".json"
              };
              makeAPICall(callData, function(response) {
                downloadMediaItem(response, function(error, fileEntry) {
                  callback(error, fileEntry);
                });
              });
            };
          }(media_item);
          mediaTaskArray.push(mediaTask);
        });
      });
    });

    async.parallel(mediaTaskArray, downloadDone);
  }

  function downloadDone() {
    console.log("downloadDone");
    $.mobile.changePage($("#editTrackPOIListPage"));
  }

  // Metadata editing

  function populateTrackInfoPage1() {
    $("#editTrackName").val(currentEditingTour.name);
    $("#editTrackDescription").val(currentEditingTour.description);
    $("#editTrackDifficulty").val(currentEditingTour.difficulty);
    //TODO: $("#editTrackSubject").val(currentEditingTour)
  }

  function populateTrackInfoPage2() {
    //TODO: code to display cover_image
    if (currentEditingTour.fullitem.indexOf("missing.png") == -1) {
      $("#editTrackInfoImage").attr("src", currentEditingTour.fullitem);
    }
  }

  function saveCoverImageFromLibrary() {
    saveCoverImage(navigator.camera.PictureSourceType.PHOTOLIBRARY);
  }

  function saveCoverImageFromCamera() {
    saveCoverImage(navigator.camera.PictureSourceType.CAMERA);
  }

  function saveCoverImage(sourceType) {
    navigator.camera.getPicture(cameraSuccess, cameraError, {
      quality: 40,
      destinationType: navigator.camera.DestinationType.FILE_URI,
      sourceType: sourceType
    });

    function cameraSuccess(photoURL) {
      console.log("photo success");
      currentEditingTour.fullitem = photoURL;
      console.log($("#editTrackInfoImage").attr("src"));
      $.mobile.changePage($("#editTrackInputPage2"));
    }

    function cameraError(error) {
      console.log(error);
    }
  }

  function uploadTourMetadata(event) {
    console.log("uploadTourMetadata");
    var tourMetadata = {};
    tourMetadata.name = $("#editTrackName").val();
    tourMetadata.difficulty = $("#editTrackDifficulty").val();
    tourMetadata.description = $("#editTrackDescription").val();
    tourMetadata.id = currentEditingTour.id;
    if ($("#editTrackInfoImage").attr("src").indexOf("http") != 0) {
      uploadMetadataCoverImage($("#editTrackInfoImage").attr("src"), uploadTourMetadata);
    } else {
      uploadTourMetadata();
    }
    return;

    function uploadMetadataCoverImage(imageURI, doneCallback) {
      uploadMedia({
        mediaURL: imageURI,
        objectName: "tour",
        mediaFieldName: "cover_image",
        objectID: tourMetadata.id,
        mimeType: "image/jpeg",
        doneCallback: doneCallback
      });
    }

    function uploadTourMetadata() {
      console.log("uploadTourMetadata");
      var callData = {
        type: 'put',
        path: "/tours/" + tourMetadata.id + ".json"
      };
      callData.data = tourMetadata;
      console.log(callData);
      makeAPICall(callData, function() {
        alert("Tour metadata saved");
        $.mobile.changePage($("#editTrackPOIListPage"), {
          transition: "slide"
        });
      })
    }
  }

  // Point Editing

  function populatePointList() {
    console.log("populatePointList");
    var $pointTemplate = $("#editTrackPOIListItemTemplate").clone(false);
    $("#editTrackPOIList").children().remove('li:not(#editTrackPOIListItemTemplate)');

    for (var i = 0; i < currentEditingTour.interest_points.length; i++) {
      var myPoint = currentEditingTour.interest_points[i];

      var $pointListEntry = $pointTemplate.clone(false);
      $pointListEntry.removeAttr("id");
      $pointListEntry.data("pointIndex", i);
      $pointListEntry.find(".editTrackPOIListItemTitle").text(myPoint.name);
      //TODO: get filler image if none is available
      $pointListEntry.find(".editTrackPOIListItemImage").attr("src", "");
      $.each(myPoint.interp_items, function(index, interp_item) {
        $.each(interp_item.media_items, function(index, media_item) {
          var mimeType = media_item.item_content_type;
          var filename = media_item.item_file_name;
          console.log(mediaFiles[filename].fullPath);
          var $pointImage = $pointListEntry.find(".editTrackPOIListItemImage");
          if ((mimeType.indexOf("image") == 0) && (!($pointImage.attr("src")))) {
            $pointImage.attr("src", mediaFiles[filename].fullPath);
          }
        });
      });
      $("#editTrackPOIList").append($pointListEntry);
      $pointListEntry.show();
    }
    $(".editTrackPOIListItem").click(function() {
      var pointIndex = $(this).data("pointIndex");
      currentEditPointIndex = pointIndex;
      $.mobile.changePage("#editTrackPOIInfoPage1")
    });
    $("#editTrackPOIListItemTemplate").hide();
    $("#editTrackPOIList").listview('refresh');
  }

  // note that this also populates the audio item on the 
  // second page, even though it's not visible yet.

  // should probably skip this if the current point has already been loaded, 
  // so we can use the elements as our variables without worrying about
  // them being reset

  function populatePointInfoPage1() {
    console.log("populatePointInfoPage1");
    var currentPoint = currentEditingTour.interest_points[currentEditPointIndex];
    $("#editTrackPOIName").val(currentPoint.name);
    var myAudio = null;
    $.each(currentPoint.interp_items, function(index, interp_item) {
      $.each(interp_item.media_items, function(index, media_item) {
        var mimeType = media_item.item_content_type;
        var filename = media_item.item_file_name;
        if (mimeType.indexOf("text") == 0) {
          getTextItem(filename, function(textContents) {
            $("#editTrackPOIDescription").html(textContents);
          });
        } else if (mimeType.indexOf("audio") == 0) {
          if (!($("#editTrackAudioPointPlay").data("src"))) {
            console.log("resetting audio");
            currentPoint.audioMediaItemID = media_item.id;
            $("#editTrackAudioPointPlay").data("src", mediaFiles[filename].fullPath);
          }
          $("#editTrackAudioPointPlay").click(function(event) {
            playAudio();
          });
        } else if (mimeType.indexOf("image") == 0) {
          // if we haven't been here before, set the src and the id
          if (!currentPoint.imageMediaItemID) {
            currentPoint.imageMediaItemID = media_item.id;
            console.log("resetting #editTrackPOIImage");
            $("#editTrackPOIImage").attr('src', mediaFiles[filename].fullPath);
          }
        }
      });
    })

    function playAudio() {
      if (myAudio == null) {
        myAudio = new Media($("#editTrackAudioPointPlay").data("src"),
        audioSuccess, audioError, audioStatus);
      }
      myAudio.play({
        numberOfLoops: 1
      });
    }

  }

  function savePointImageFromLibrary() {
    savePointImage(navigator.camera.PictureSourceType.PHOTOLIBRARY);
  }

  function savePointImageFromCamera() {
    saveCoverImage(navigator.camera.PictureSourceType.CAMERA);
  }

  function savePointImage(sourceType) {
    navigator.camera.getPicture(cameraSuccess, cameraError, {
      quality: 40,
      destinationType: navigator.camera.DestinationType.FILE_URI,
      sourceType: sourceType
    });

    function cameraSuccess(photoURL) {
      console.log("photo success");
      $("#editTrackPOIImage").attr("src", photoURL);
      $.mobile.changePage($("#editTrackPOIInfoPage1"));
    }

    function cameraError(error) {
      console.log(error);
    }
  }

  function recordPointAudio(event) {
    navigator.device.capture.captureAudio(captureSuccess, captureError, {
      limit: 1
    });

    function captureSuccess(audioFiles) {
      console.log("captureSuccess");
      console.log(audioFiles[0].fullPath);
      $("#editTrackAudioPointPlay").data("src", audioFiles[0].fullPath);
    }

    function captureError(error) {
      alert("An error has occurred (recordAudio): Code = " + error.code);
    }
  }

  function audioSuccess() {
    $("#viewTrackAudioPointPause").click(function(event) {
      event.preventDefault();
      myAudio.pause();
    });
    $("#viewTrackAudioPointRestart").click(function(event) {
      event.preventDefault();
      myAudio.seekTo(0);
    });
  }

  function audioStatus(code) {
    // may need this for control updates
    console.log("Audio Status: " + code);
  }

  function audioError() {
    console.log("Error: " + response);
  }

  function uploadNewPointData(event) {
    console.log("uploadNewPointData");
    var pointData = {};
    pointData.name = $("#editTrackPOIName").val();
    pointData.description = $("#editTrackPOIDescription").val();
    pointData.imageMediaItemID = currentEditingTour.interest_points[currentEditPointIndex].imageMediaItemID;
    pointData.audioMediaItemID = currentEditingTour.interest_points[currentEditPointIndex].audioMediaItemID;
    if ($("#editTrackPOIImage").attr("src").indexOf("http") != 0) {
      uploadPointImage($("#editTrackPOIImage").attr("src"), function() {
        if ($("#editTrackAudioPointPlay").data("src")) {
          uploadPointAudio($("#editTrackAudioPointPlay").data("src"), function() {
            uploadPointMetadata();
          });
        }
      });
    } else {
      uploadPointMetadata();
    }

    $.mobile.changePage($("#editTrackPOIListPage"), {
      transition: "slide"
    });
    return;

    function uploadPointImage(imageURI, doneCallback) {
      console.log("uploadPointImage")
      uploadMedia({
        mediaURL: imageURI,
        objectName: "media_item",
        mediaFieldName: "item",
        objectID: pointData.imageMediaItemID,
        mimeType: "image/jpeg",
        doneCallback: doneCallback
      });
      // hack to change POI list item image
      // look for the current list item and replace the img src
      $.each("#editTrackPOIList li", function(index, $listItem) {
        if ($listitem.data("pointIndex") == currentEditPointIndex) {
          $listitem.find(".editTrackPOIListItemImage").attr("src", imageURI)
        }
      });
    }

    function uploadPointAudio(audioURI, doneCallback) {
      console.log("uploadPointAudio");
      uploadMedia({
        mediaURL: audioURI,
        objectName: "media_item",
        mediaFieldName: "item",
        objectID: pointData.audioMediaItemID,
        mimeType: "audio/wav",
        doneCallback: doneCallback
      });
    }

    function uploadPointMetadata() {
      console.log("uploadPointMetadata");
      var callData = {
        type: 'put',
        path: "/media_items/" + pointData.id + ".json"
      };
      callData.data = pointMetadata;
      console.log(callData);
      makeAPICall(callData, function() {
        alert("Point metadata saved");
        $.mobile.changePage($("#editTrackPOIListPage"), {
          transition: "slide"
        });
      })
    }


  }

  function getTextItem(filename, CB) {
    var reader = new FileReader();
    var fileEntry = mediaFiles[filename];
    reader.onloadend = function(evt) {
      CB(evt.target.result);
    }
    fileEntry.file(function(myFile) {
      reader.readAsText(myFile);
    });
  }

  function downloadMediaItem(itemInfo, doneCallback) {
    var itemURL = itemInfo.fullitem;
    var itemType = itemInfo.item_content_type;
    window.requestFileSystem(LocalFileSystem.TEMPORARY, 0, gotFS, fail);

    function gotFS(filesystem) {
      filesystem.root.getDirectory("tour" + currentEditingTour.id, {
        create: true,
        exclusive: false
      }, gotDir, fail);
    }

    function gotDir(directory) {
      directory.getFile(itemInfo.item_file_name, {
        create: true,
        exclusive: false
      }, gotFile, fail);
    }

    function gotFile(fileEntry) {
      var fileTransfer = new FileTransfer();
      fileTransfer.download(itemURL, fileEntry.fullPath, downloadSuccess, fail);
    }

    function downloadSuccess(fileEntry) {
      console.log("downloadSuccess");
      // console.log(fileEntry);
      mediaFiles[fileEntry.name] = fileEntry;

      doneCallback(null, fileEntry.name);
    }

    function fail(error) {
      console.log(error);
      doneCallback("downloadFail", itemInfo.fullitem);
    }
  }

  function makeAPICall(callData, doneCallback) {
    console.log('makeAPICall');
    if (!($.isEmptyObject(callData.data))) {
      callData.data = JSON.stringify(callData.data);
    }
    var url = host + callData.path;
    var request = $.ajax({
      type: callData.type,
      url: url,
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      //beforeSend: function(xhr) {
      //  xhr.setRequestHeader("Accept", "application/json")
      //},
      data: callData.data
    }).fail(function(jqXHR, textStatus, errorThrown) {
      $("#results").text("error: " + JSON.stringify(errorThrown));
    }).done(function(response, textStatus, jqXHR) {
      if (typeof doneCallback === 'function') {
        //responseObj = JSON.parse(response);
        //console.log("responseObj: " + responseObj);
        doneCallback.call(this, response);
      }
      $("#results").text(JSON.stringify(response));
    });
  }


  function uploadMedia(params) {
    // { mimetype, objectName, mediaFieldName, objectID, mediaURL, doneCallback }
    // supply ID for update to an existing item
    // make sure the server will accept POST for updates
    // because that's all Phonegap's FileTransfer can do 
    console.log("uploadMedia");
    var ftOptions = new FileUploadOptions();
    ftOptions.mimeType = params.mimeType;
    ftOptions.fileKey = params.objectName + "[" + params.mediaFieldName + "]";
    ftOptions.fileName = params.mediaURL.substr(params.mediaURL.lastIndexOf('/') + 1);

    var ftParams = new Object();
    params[params.objectName + "[name]"] = "Placeholder Name";
    ftOptions.params = ftParams;
    //ftOptions.chunkedmode = false;

    var ft = new FileTransfer();
    var ftURL;
    if (params.objectID) {
      ftURL = host + "/" + params.objectName + "s/" + params.objectID + ".json";
    } else {
      ftURL = host + "/" + params.objectName + "s.json";
    }
    console.log(params.mediaURL);
    console.log(ftURL);
    console.log(ftOptions);
    ft.upload(params.mediaURL, ftURL, uploadWin, uploadFail, ftOptions);

    return;

    function uploadWin(r) {
      console.log("Code = " + r.responseCode);
      params.doneCallback(r.response);
    }

    function uploadFail(error) {
      alert("An error has occurred (uploadMedia:): Code = " + error.code + "(" + params.mediaURL + ")");
      if (confirm("uploadMedia Failed. Try again?")) {
        uploadMedia(params);
      } else {
        // silent fail!
      }
    }
  }
}

$(document).ready(function() {
  // are we running in native app or in browser?
  window.isphone = false;
  if (document.URL.indexOf("http://") == -1) {
    window.isphone = true;
  }

  if (window.isphone) {
    document.addEventListener("deviceready", onDeviceReadyEdit, false);
  } else {
    onDeviceReadyEdit();
  }
});