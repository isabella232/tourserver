"use strict";

// track creation code for TrackJack mobile app

function onDeviceReadyCreate() {
  console.log("onDeviceReady-create");
  $("#location").text(window.isphone ? "Phone" : "Not Phone");
  // change this to your server's IP
  // var host = "http://127.0.0.1:3000";
  var host = "http://trackserver-test.herokuapp.com";
  var minCreatePointAccuracy = 100;
  var tour = {
    interest_points: []
  };
  var currentPoint = {};
  var geoWatchID = null;
  var latestPosition;

  if (!window.isphone) {
    $(".desktop").show();
  } else {
    $(".phone").show();
  }

  $('#createTrackUpload').click(uploadTour);

  // start Tour button
  $("#createTrackStartRecording").click(function(event) {
    console.log("createTrackName");
    console.log($("#createTrackName").val());
    if ($("#createTrackName").val()) {
      tour.name = $("#createTrackName").val();
      tour.difficulty = $("#createTrackRating").val();
      tour.description = $("#createTrackDescription").val();
      // TODO: tour.subject = $("#createTrackSubject").val();
      // start tracking the path
      startGeolocation();
    } else {
      alert("Please enter a name for this track.");
      $.mobile.changePage($("#createTrackInputPage1"));
      return false;
    }
  });

  // create point
  $("#createTrackAddPoint").click(function(event) {
    console.log("createTrackAddPoint");
    //click on the interest_point create button,
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {
      enableHighAccuracy: true,
      timeout: 2000
    });

    function geoError(error) {
      console.log("error:");
      console.log(error);
      alert("Trouble getting your position. Wait a few seconds and try again.");
    }

    function geoSuccess(position) {
      latestPosition = position;
      if (position.coords.accuracy <= minCreatePointAccuracy) {
        logpp(position);
        //$('#location').text(position.coords.longitude.toFixed(5) + " " + position.coords.latitude.toFixed(5) + " " + position.coords.accuracy + "m");
        createInterestPoint(position);
      } else {
        // this should be smarter, and try again
        alert(position.coords.accuracy + " Getting a lock on your position. Wait a few seconds and try again.");
      }
    }

    function createInterestPoint(position) {
      var lon = position.coords.longitude.toFixed(5);
      var lat = position.coords.latitude.toFixed(5);
      var interest_point = {
        location: "POINT(" + lon + " " + lat + ")"
      };
      currentPoint = interest_point;
      currentPoint.interp_items = currentPoint.interp_items || [];
      currentPoint.interp_items.push({
        name: "Passthrough"
      });
    }
  });


  // take photo 
  $("#createTrackUploadImageCamera").click(function(event) {
    console.log("camera");
    saveCoverImage(navigator.camera.PictureSourceType.CAMERA);
  });

  // Photo upload ///
  $("#createTrackUploadImageLibrary").click(function(event) {
    saveCoverImage(navigator.camera.PictureSourceType.PHOTOLIBRARY);
  });

  function saveCoverImage(sourceType) {
    navigator.camera.getPicture(cameraSuccess, cameraError, {
      quality: 40,
      destinationType: navigator.camera.DestinationType.FILE_URI,
      sourceType: sourceType
    });

    function cameraSuccess(photoURL) {
      console.log("photo success");
      $("#createTrackImage").attr("src", photoURL);
      tour.cover_image_url = photoURL
      $.mobile.changePage($("#createTrackInputPage2"));
    }

    function cameraError(error) {
      console.log(error);
    }

  }



  // upload photo from album button
  $("#createTrackPOIUploadImageLibrary").click(function(event) {
    console.log("album");
    console.log("event");
    saveImage(navigator.camera.PictureSourceType.PHOTOLIBRARY);
  });

  // take photo 
  $("#createTrackPOIUploadImageCamera").click(function(event) {
    console.log("camera");
    saveImage(navigator.camera.PictureSourceType.CAMERA);
  });

  function saveImage(sourceType) {
    navigator.camera.getPicture(cameraSuccess, cameraError, {
      quality: 40,
      destinationType: navigator.camera.DestinationType.FILE_URI,
      sourceType: sourceType
    });

    function cameraSuccess(photoURL) {
      console.log("photo success");
      $("#createTrackPOIImage").attr("src", photoURL);
      var media_item = {};
      currentPoint.interp_items[0].media_items_attributes = currentPoint.interp_items[0].media_items_attributes || [];
      currentPoint.interp_items[0].media_items_attributes.push({
        type: "image",
        data: photoURL
      });
      console.log("media_items_attributes.length" + currentPoint.interp_items[0].media_items_attributes.length);
      console.log(photoURL);
      $.mobile.changePage($("#createTrackPOIPage1"));
    }

    function cameraError(error) {
      console.log(error);
    }
  }

  function uploadPhoto(imageURI, uploadCallback) {
    uploadMedia(imageURI, uploadCallback, "image/jpeg");
  }

  function uploadAudio(audioURI, uploadCallback) {
    uploadMedia(audioURI, uploadCallback, "audio/wav");
  }

  /// Text upload ///
  // write text to a file to get a file URL to pass to uploadMedia

  function writeAndUploadText(text, uploadCallback) {
    text = text.substr(0, 1500);
    console.log("uploadText");
    // so very wrong. and yet:
    var fileName = Math.floor(Math.random() * 10000000) + ".txt";
    window.requestFileSystem(LocalFileSystem.TEMPORARY, 0, gotFS, fail);

    function gotFS(fileSystem) {
      fileSystem.root.getFile(fileName, {
        create: true,
        exclusive: false
      }, gotFileEntry, fail);
    }

    function gotFileEntry(fileEntry) {
      fileEntry.createWriter(gotFileWriter, fail);
    }

    function gotFileWriter(writer) {
      console.log("writer.filename: ");
      console.log(writer.fileName)
      writer.onwriteend = function(evt) {
        console.log("evt");
        console.log(evt);
        uploadMedia(writer.fileName, uploadCallback, "text/plain");
      };
      writer.write(text);
    }

    function fail(error) {
      alert("An error has occurred: (writeAndUploadText) Code = " + error.code);
    }
  }


  /// the next two functions (uploadMedia/uploadCoverImage) should maybe be consolidated

  function uploadMedia(mediaURI, uploadCallback, mimeType) {
    var options = new FileUploadOptions();
    options.mimeType = mimeType;
    options.fileKey = "media_item[item]";
    options.fileName = mediaURI.substr(mediaURI.lastIndexOf('/') + 1);

    var params = new Object();
    params["media_item[name]"] = "Placeholder Name";
    options.params = params;
    //options.chunkedmode = false;

    var ft = new FileTransfer();
    ft.upload(mediaURI, host + "/media_items.json", uploadWin, uploadFail, options);

    return;

    function uploadWin(r) {
      console.log("Code = " + r.responseCode);
      uploadCallback(r.response);
    }

    function uploadFail(error) {
      alert("An error has occurred (uploadMedia:): Code = " + error.code + "(" + mediaURI + ")");
      if (confirm("uploadMedia Failed. Try again?") + JSON.stringify(callData.data)) {
        uploadMedia(mediaURI, uploadCallback, mimeType);
      } else {
        // silent fail!
      }
    }
  }

  // this is actually where the tour record is created,
  // because I haven't been able to come up with a clever way 
  // to post a JSON tour record and a Paperclip attachment
  // at the same time. We create the tour record when uploading
  // the cover_photo, then update it later with the tour info

  function uploadCoverImage(mediaURI, uploadCallback, mimeType) {
    console.log("uploadCoverImage");
    console.log("mediaURI");
    var options = new FileUploadOptions();
    options.mimeType = mimeType;
    options.fileKey = "tour[cover_image]";
    options.fileName = mediaURI.substr(mediaURI.lastIndexOf('/') + 1);

    var params = new Object();
    params["tour[cover_image]"] = "Cover Image";
    options.params = params;
    //options.chunkedmode = false;

    var ft = new FileTransfer();
    ft.upload(mediaURI, host + "/tours.json", uploadWin, uploadFail, options);

    return;

    function uploadWin(r) {
      console.log("Code = " + r.responseCode);
      uploadCallback(r.response);
    }

    function uploadFail(error) {
      alert("An error has occurred (uploadMedia:): Code = " + error.code + "(" + mediaURI + ")");
      if (confirm("uploadMedia Failed. Try again?") + JSON.stringify(callData.data)) {
        uploadMedia(mediaURI, uploadCallback, mimeType);
      } else {
        // silent fail!
      }
    }
  }

  //Record Audio button
  $("#createTrackRecordAudio").click(function(event) {
    navigator.device.capture.captureAudio(captureSuccess, captureError);

    function captureSuccess(mediaFiles) {
      for (var i = 0; i < mediaFiles.length; i++) {
        currentPoint.interp_items[0].media_items_attributes = currentPoint.interp_items[0].media_items_attributes || [];
        var myAudioMediaItem = {
          type: "audio",
          data: mediaFiles[i].fullPath
        };
        console.log("myAudioMediaItem");
        logpp(myAudioMediaItem);
        currentPoint.interp_items[0].media_items_attributes.push(myAudioMediaItem);
      }
    }

    function captureError(error) {
      alert("An error has occurred (recordAudio): Code = " + error.code);
    }
  });

  //Cancel the current point input
  $("#cancelPoint").click(function(event) {
    clearCurrentPoint();
    logpp(tour);
  });

  // save the current point
  $("#createTrackPOISubmit").click(function(event) {
    currentPoint.name = $('#createTrackPOIName').val();
    // add an interp_item. For now, each interest_point will have only one interpretive item [0].
    // later, we can use interp_item as a container for groups of media_items
    currentPoint.interp_items = currentPoint.interp_items || [];
    currentPoint.interp_items[0].media_items_attributes = currentPoint.interp_items[0].media_items_attributes || [];
    if ($('#createTrackPOIDescription').val()) {
      var myTextMediaItem = {
        type: "text",
        data: $('#createTrackPOIDescription').val()
      };
      console.log("textmediaitem");
      logpp(myTextMediaItem);
      currentPoint.interp_items[0].media_items_attributes.push(myTextMediaItem);
    }
    tour.interest_points.push(currentPoint);
    clearCurrentPoint();
  });

  function clearCurrentPoint() {
    $('#createTrackPOIName').val('');
    $('#createTrackPOIDescription').val('');
    $('#createTrackPOIImage').attr("src", "");
    currentPoint = {};
  }

  // save tour button
  // for now, this isn't actually going to create the tour, but update one
  // already created, because we need to upload the cover_image first.
  // that's when we create the tour

  function uploadTour(event) {

    console.log("uploadTour");
    stopGeolocation();
    // submitMediaItems calls submitTour on completion
    submitMediaItems(tour);
    logpp(tour);
    return;

    function submitTour(tour) {
      console.log("submitTour");
      var callData;
      // there's no pre-exisitng tour record if there's been no cover image upload
      if (tour.id) {
        callData = {
          type: "put",
          path: "/tours/" + tour.id + ".json"
        };
      } else {
        callData = {
          type: "post",
          path: "/tours.json"
        }
      }
      callData.data = reformatTourForSubmission(tour);
      makeAPICall(callData, function() {
        alert("Tour saved!");
        $.mobile.changePage($("#createFinishPage"), {
          transition: "slide"
        });
        window.location.reload(false);
      });
    };

    function submitMediaItems(tour) {
      console.log("submitMediaItems");
      // is there a better way to avoid undefined issues? 
      var mediaSubmitParams = [];
      if (tour.interest_points) {
        for (var i = 0; i < tour.interest_points.length; i++) {
          var myPoint = tour.interest_points[i];
          if (myPoint.interp_items) {
            for (var j = 0; j < myPoint.interp_items.length; j++) {
              var myInterpItem = myPoint.interp_items[j];

              if (myInterpItem.media_items_attributes) {
                for (var k = 0; k < myInterpItem.media_items_attributes.length; k++) {
                  var myMediaItem = myInterpItem.media_items_attributes[k];
                  console.log("myMediaItem: ");
                  logpp(myMediaItem);
                  var uploadFunc = function(type) {
                    if (type.indexOf("image") == 0) {
                      return uploadPhoto;
                    } else if (type.indexOf("text") == 0) {
                      return writeAndUploadText;
                    } else if (type.indexOf("audio") == 0) {
                      return uploadAudio;
                    }
                  }(myMediaItem.type);
                  var myCallback = function(myMediaItem) {
                    return function(response) {
                      myMediaItem = addMediaItemIDToTour(response, myMediaItem);
                      console.log("in upload.callback");
                    };
                  }(myMediaItem);
                  mediaSubmitParams.push({
                    data: myMediaItem.data,
                    mediaUploadFunc: uploadFunc,
                    callback: myCallback
                  });
                }
              }
            }
          }
        }
      }

      // now we have an array of {mediaUploadFunc, data} items.
      // execute each mediaUploadFunc with data -- in series --
      // to get the saved id for each media item
      // then use the series completion callback to trigger saving the tour object
      if (mediaSubmitParams) {
        var funcArray = [];
        console.log("mediaSubmitParams.length " + mediaSubmitParams.length);
        for (var i = 0; i < mediaSubmitParams.length; i++) {
          var curMediaItem = mediaSubmitParams[i];
          var myMediaUploadArrayItem = function(curMediaItem) {
            return function(callback) {
              curMediaItem.mediaUploadFunc(curMediaItem.data, function(response) {
                console.log("seriesItemCallback");
                curMediaItem.callback(response);
                callback(null, "two");
              });
            }
          }(curMediaItem);
          funcArray.push(myMediaUploadArrayItem);
        }
        if ($("#createTrackImage").attr("src")) {
          funcArray.push(function(callback) {
            uploadCoverImage($("#createTrackImage").attr("src"), function(response) {
              console.log("finalSeriesCallback");
              addTourIDToTour(response);
              callback(null, "three")
            }, "image/jpeg");
          });
        }
        console.log(funcArray);
        async.series(funcArray, asyncCallback);
      }
    }

    function asyncCallback(err, results) {
      console.log("asyncCallback");
      console.log(err);
      console.log(results);
      submitTour(tour);
    }

    function addTourIDToTour(response) {
      console.log("addTourIDToTour");
      response = JSON.parse(response);
      logpp(response);
      tour.id = response.id;
      console.log(tour.id);
    }

    function addMediaItemIDToTour(response, mediaItem) {
      var myResponse = JSON.parse(response);
      mediaItem.id = myResponse.id;
      console.log("mediaItem: ");
      logpp(mediaItem);
      return mediaItem;
    }

    function reformatTourForSubmission(tour) {
      console.log("reformatTourForSubmission");
      // reformatting for Rails. It likes nested resource names to end with _attributes.
      for (var i = 0; i < tour.interest_points.length; i++) {
        var myPoint = tour.interest_points[i];
        if (myPoint.interp_items) {
          for (var j = 0; j < myPoint.interp_items.length; j++) {
            var myInterpItem = myPoint.interp_items[j];
            if (myInterpItem.media_items_attributes) {
              for (var k = 0; k < myInterpItem.media_items_attributes.length; k++) {
                var myMediaItem = myInterpItem.media_items_attributes[k];
                delete myMediaItem.data;
                delete myMediaItem.type;
              }
            } else {
              delete myInterpItem.media_items_attributes;
            }
          }
        }
        myPoint.interp_items_attributes = myPoint.interp_items;
        delete myPoint.interp_items;
      }
      if (tour.interest_points) {
        tour.interest_points_attributes = tour.interest_points;
        delete tour.interest_points;
      }

      if (tour.cover_image_url) {

      }
      // make the heartbeat WKT path
      tour.path = "LINESTRING" + "(" + tour.pathpoints.join(", ") + ")";
      console.log("end reformatTourForSubmission");
      return tour;
    }

  }

  // Stop recording tour, but keep it in memory for later upload
  // Not sure this works as expected.
  $('#stopTour').click(function(event) {
    console.log("stopTour");
    if (confirm("Stop Recording?")) {
      $("#createPOI").attr('disabled', false);
      $("div#pointInputArea :input").attr('disabled', true);
      stopGeolocation();
    }
  });

  // Cancel the tour and reset everything
  $('#createTrackMainPage').on('pagebeforechange', function(data) {
    console.log(data);
    if (confirm("Cancel Tour Recording?")) {
      // resetTour();
    } else {

    }

  });

  function startGeolocation() {
    geoWatchID = navigator.geolocation.watchPosition(geoSuccess, geoError, {
      enableHighAccuracy: true,
    });
  }

  function stopGeolocation() {
    navigator.geolocation.clearWatch(geoWatchID);
    geoWatchID = null;
  }

  function geoSuccess(position) {
    if (tour.interest_points) {
      $("span#pointsSavedCount").text(tour.interest_points.length);
    }

    latestPosition = position;
    $('#activeLocation').text("Now: " + position.coords.longitude.toFixed(5) + " " + position.coords.latitude.toFixed(5) + " " + position.coords.accuracy + "m");
    if ((position.coords.accuracy) < minCreatePointAccuracy) {
      var newPathLocation = position.coords.longitude + " " + position.coords.latitude;
      tour.pathpoints = tour.pathpoints || [];
      tour.pathpoints.push(newPathLocation);
      console.log(tour.pathpoints.length);
    } else {
      //alert("GPS accuracy too low. Wait a few seconds and try again.");
    }
    $('currentTourInfo').html(tour);
  }

  function geoError(data) {
    console.log(data);
  }

  function makeAPICall(callData, doneCallback) {
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
      //data: JSON.stringify(data)
    }).fail(function(jqXHR, textStatus, errorThrown) {
      //$("#results").text("error: " + JSON.stringify(errorThrown));
      if (confirm("API Call Failed. Try again?") + JSON.stringify(callData.data)) {
        makeAPICall(callData, doneCallback);
      } else {
        // silent fail!
      }
    }).done(function(response, textStatus, jqXHR) {
      if (typeof doneCallback === 'function') {
        doneCallback.call(this, response);
      }
      $("#results").text(JSON.stringify(response));
    });
  }
}

function logpp(js) {
  console.log(JSON.stringify(js, null, "  "));
}


$(document).ready(function() {
  // are we running in native app or in browser?
  window.isphone = false;
  if (document.URL.indexOf("http://") == -1) {
    window.isphone = true;
  }

  if (window.isphone) {
    document.addEventListener("deviceready", onDeviceReadyCreate, false);
  } else {
    onDeviceReadyCreate();
  }
});