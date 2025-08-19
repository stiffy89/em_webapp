sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML",
    "sap/ui/core/ws/WebSocket",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, JSONModel, HTML, WebSocket, MessageBox) => {
    "use strict";

    return Controller.extend("emwebapp.controller.Main", {

        onInit() {
            let oController = this;
            let sBaseUriPath = oController.getOwnerComponent().getManifestObject()._oBaseUri._string;
            oController._emBasePath = sBaseUriPath + "/messagingrest/v1/queues/ernox%2Fdevko104%2Femdev%2F";

            //get our security scopes
            $.ajax({
                url: "user-api/currentUser",
                method: "GET",
                async: false,
                success: function (result, status, xhr) {
                    oController._userDetails = result;

                    //connect our application to the websocket
                    oController.onConnectToWebsocket(result.scopes).then(() => {
                        //instantiate the client side data
                        let oDemoData = {
                            "loggedInUser" : oController._userDetails,
                            "messages" : [],
                            "typing" : {
                                "isTyping" : false,
                                "personTyping" : ""
                            }
                        }

                        oController.bindAppData(oDemoData);
                        
                    }).catch((err) => {
                        oController.showErrorMessage("Cannot connect to websocket", "Websocket connection error")
                    });
                },
                error: function (xhr, status, error) {
                    oController.showErrorMessage("Cannot get user scope data", "Authentication error")
                }
            });
        },

        showErrorMessage: function (sMessage, sTitle) {
            MessageBox.show(
                sMessage, {
                    title: sTitle
                }
            )
        },

        bindAppData: function (data) {
            let oPage = this.getView().byId('page');
            let oModel;

            if (oPage.getModel()){
                oModel = oPage.getModel();
                oModel.setData(data);
            }
            else {
                oModel = new JSONModel(data);
            }

            oPage.setModel(oModel);
        },

        formatTitle : function (val) {
            console.log(val);
            return "Event Mesh Messenger Application for " + val;
        },

        createNewChatBubble : function (oContext) {
            let oController = this;
            let userId = oContext.getProperty('userid');
            let username = oContext.getProperty('user');
            let timestamp = oContext.getProperty('datetime');
            let sMessage = oContext.getProperty('message');
            let sHexCode = oContext.getProperty('hexcode');

            let sClass = "from-them";
            
            //if the user is me, we will move the message to the right and turn the background to green
            if (oController._userDetails){
                if (userId == oController._userDetails.email){
                    sClass = "from-me";
                }
            }

            let aMessageData = oContext.getModel().getProperty("/messages");
            let aPathArr = oContext.getPath().split("/");
            let iCurrMsgIndex = parseInt(aPathArr[aPathArr.length - 1]);

            let sHTMLString = "<div class='imessage "+ sClass+"'" + ">"+
                            "<p>";

            if (sClass == 'from-me'){
                //if its from me - no need for the name at the top
                sHTMLString += sMessage + "<br>" +
                        "<small style='font-size: 11px'>" + timestamp + "</small><br>" + 
                    "</p>"+
                "</div>"
            } else {
                //if its from someone else, check to see if the last message was them
                if (iCurrMsgIndex > 0){
                    const oLastMsg = aMessageData[iCurrMsgIndex - 1];
                    if (oLastMsg.userid == userId){
                        //same person who send the last message
                        sHTMLString += sMessage + "<br>" +
                                "<small style='font-size: 11px'>" + timestamp + "</small><br>" + 
                            "</p>"+
                        "</div>"
                    } else {
                        //someone else
                        sHTMLString += "<b style='color:"+sHexCode+";'>" + username + "</b><br>" +
                                sMessage + "<br>" +
                                "<small style='font-size: 11px'>" + timestamp + "</small><br>" + 
                            "</p>"+
                        "</div>"
                    }
                } else {
                    //if its from someone else but its the first message
                    sHTMLString += "<b style='color:"+sHexCode+";'>" + username + "</b><br>" +
                            sMessage + "<br>" +
                            "<small style='font-size: 11px'>" + timestamp + "</small><br>" + 
                        "</p>"+
                    "</div>"
                }
            }

            return new HTML({
                content: sHTMLString
            });
        },

        createNewChatEvent : function (oContext) {
            let sUserId = oContext.getProperty('user');
            let sStatus = oContext.getProperty('status');
            let sStatusText = "";
            if (sStatus == 'join'){
                sStatusText += " has joined the conversation"
            } else {
                sStatusText += " has left the conversation"
            }

            let sHTMLString = "<div style='display:flex; justify-content:center;'>"+"<p style='color: #ac5e5e; font-size: small;'>" + sUserId + sStatusText + "</p>"+"</div>";

            return new HTML({
                content: sHTMLString
            })
        },

        createFeed: function (sId, oContext) {
            let oController = this;
            let type = oContext.getProperty('type');
            let factoryItem;

            if (type == 'userstatus') {
                factoryItem = oController.createNewChatEvent(oContext);
            }
            else {
                factoryItem = oController.createNewChatBubble(oContext);
            }

            return factoryItem;
        },

        onSendMessage: function (e) {
            let oController = this;

            let oInput = this.getView().byId('input');
            let sVal = oInput.getValue();
        
            
            if (sVal) {
                //send the message
                let sTime = new Date().toLocaleTimeString(navigator.language, {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                function capitaliseFirstLetter(val) {
                    return val.charAt(0).toUpperCase() + val.slice(1);
                }

                oController.onSendEvent({
                    'type' : 'message',
                    'message' : {
                        'userid' : oController._userDetails.email,
                        'user' : capitaliseFirstLetter(oController._userDetails.firstname) + " " + capitaliseFirstLetter(oController._userDetails.lastname),
                        'datetime' : sTime,
                        'message' : sVal
                    } 
                }, function () {
                    oInput.setValue("");
                })
            }
        },

        onSendEvent: function (oMessage, fnSuccessCallback) {
            
            let oController = this;

            let sEmPath; 

            if (oMessage.type == "message"){
                sEmPath = oController._emBasePath + "em_messenger/messages";
            }
            else {
                sEmPath = oController._emBasePath + "typingstatus/messages";
            }

            $.ajax({
                url: sEmPath,
                method: "POST",
                dataType: 'json',
                data: JSON.stringify(oMessage.message),
                async: false,
                success: function (result, status, xhr) {
                    if (fnSuccessCallback){
                        fnSuccessCallback()
                    }
                },
                error: function (xhr, status, error) {
                    oController.showErrorMessage("An error occurred while sending the Event.", "Event error")
                }
            })
        },

        onLiveChange: function (e) {
            let oController = this;

            if (!oController._liveChange){

                const oMessage = {
                    "isTyping" : true,
                    "personTyping" : oController._userDetails.firstname + " " + oController._userDetails.lastname
                }

                oController.onSendEvent({
                    'type' : 'status',
                    'message' : oMessage        
                }, null)
            }

            clearTimeout(oController._liveChange);
            oController._liveChange = setTimeout(() => {

                const oMessage = {
                    "isTyping" : false,
                    "personTyping" : oController._userDetails.firstname + " " + oController._userDetails.lastname
                }

                oController.onSendEvent({
                    'type' : 'status',
                    'message' : oMessage
                }, null);

                oController._liveChange = undefined;
            }, 2000);
        },

        onConnectToWebsocket: function (aScopes) {
            
            let oController = this;

            return new Promise((resolve, reject) => {
                //we will pass our email as the id when we establish the web socket connection
                var connection = new WebSocket("https://emapp.cfapps.ap10.hana.ondemand.com/websocket/app?customId=" + oController._userDetails.email, aScopes);

                connection.attachError((errData) => {
                    reject(errData);
                });

                connection.attachOpen(() => {
                    console.log('connected to websocket');
                    resolve();
                });

                connection.attachMessage((msgObj)=>{
                    console.log('message recieved');

                    const oMsg = JSON.parse(msgObj.getParameters().data);
                    oController.onMessageRecieved(oMsg);
                });
            });
        },

        onMessageRecieved: function (oMsgObj) {
            const oController = this;
            let oModelData = this.getView().byId('page').getModel().getData();
        
            if (oMsgObj.type == 'message' || oMsgObj.type == 'usertraffic'){
                oModelData.messages.push(oMsgObj.messageBody);
            } 
            else if (oMsgObj.type == 'status'){
                //check is typing
                oModelData.typing.isTyping = false;
                oModelData.typing.personTyping = "";
                const sMyName = oController._userDetails.firstname + " " + oController._userDetails.lastname;

                const bHasPeopleTyping = (oMsgObj.currentlyTyping.length > 0);
                const bAmITyping = (oMsgObj.currentlyTyping.indexOf(sMyName) >= 0);

                //if there are people typing
                if (bHasPeopleTyping){

                    //and its not me
                    if (!bAmITyping){
                        oModelData.typing.isTyping = true;
                        
                        if (oMsgObj.currentlyTyping.length > 1) {
                            const iCount = oMsgObj.currentlyTyping.length - 1;
                            oModelData.typing.personTyping = oMsgObj.currentlyTyping[0] + " and " + iCount + " other are typing";
                        } else {
                            oModelData.typing.personTyping = oMsgObj.currentlyTyping[0] + " is typing"
                        }
                    }

                    //its me but someone else is also typing
                    else {
                        if (oMsgObj.currentlyTyping.length > 1){

                            oModelData.typing.isTyping = true;

                            let aOthersTyping = oMsgObj.currentlyTyping.filter((x) => {
                                return (x !== sMyName)
                            });
                            
                            if (aOthersTyping.length > 1) {
                                const iCount = aOthersTyping.length - 1;
                                oModelData.typing.personTyping = aOthersTyping[0] + " and " + iCount + " other are typing";
                            } else {
                                oModelData.typing.personTyping = aOthersTyping[0] + " is typing"
                            }
                        }
                    }
                }

                let oTypingIndicator = oController.getView().byId('typingIndicatorFlexBox');
                
                if (oModelData.typing.isTyping) {
                    //show the message
                    oTypingIndicator.addStyleClass('visible');
                } else {
                    oTypingIndicator.removeStyleClass('visible');
                }
            }

            this.getView().byId('page').getModel().setData(oModelData);
        }
    });
});