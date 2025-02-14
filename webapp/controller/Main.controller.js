sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML",
    "sap/ui/core/ws/WebSocket",
    "sap/m/MessageBox"
], (Controller, JSONModel, HTML, WebSocket, MessageBox) => {
    "use strict";

    return Controller.extend("emwebapp.controller.Main", {

        onInit() {
            let oController = this;
            //get our security scopes
            $.ajax({
                url: "user-api/currentUser",
                method: "GET",
                async: false,
                success: function (result, status, xhr) {
                    Controller._userDetails = result;
                    console.log(Controller._userDetails);

                    //connect our application to the websocket
                    oController.onConnectToWebsocket(result.scopes).then(() => {
                        //bind the data
                        let oDemoData = {
                            "messages" : [
                                {
                                    "message" : "Check the Internet. Yup. Earthquake. This is the size. This is the epicenter. Check social media.",
                                    "user" : "John Citizen",
                                    "userid" : "johncitizen@ernox.com",
                                    "datetime" : new Date()
                                },
                                {
                                    "message" : "Check the Internet. Yup. Earthquake. This is the size. This is the epicenter. Check social media.",
                                    "user" : "Jane Doe",
                                    "userid" : "janedoe@ernox.com",
                                    "datetime" : new Date()
                                }
                            ],
                            "typing" : {
                                "isTyping" : true,
                                "whoIsTyping" : "John Citizen is typing"
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

        createMessage: function (sId, oContext) {
            let userId = oContext.getProperty('userid');
            let username = oContext.getProperty('user');
            let timestamp = oContext.getProperty('datetime').toLocaleTimeString().slice(0,5);
            let sMessage = oContext.getProperty('message');

            let sClass = "from-them";
            
            //if the user is me, we will move the message to the right and turn the background to green
            if (Controller._userDetails){
                if (userId == Controller._userDetails.email){
                    sClass = "from-me";
                }
            }
           
            return new HTML({
                content: "<div class='imessage "+ sClass+"'" + ">"+
                            "<p>" +
                                "<b>" + username + "</b><br>" +
                                sMessage + "<br>" +
                                "<small>" + timestamp + "</small><br>" + 
                            "</p>"+
                        "</div>"
            });
        },

        onSendMessage: function (e) {
            let oInput = this.getView().byId('input');
            let sVal = oInput.getValue();
            
            if (sVal) {
                //send the message
                console.log(sVal);
            }
        },

        onConnectToWebsocket: function (aScopes) {
            return new Promise((resolve, reject) => {
                var connection = new WebSocket("https://emapp.cfapps.ap10.hana.ondemand.com/websocket/app", aScopes);

                connection.attachError((errData) => {
                    reject(errData);
                });

                connection.attachOpen(() => {
                    resolve();
                });

                connection.attachMessage((msgObj)=>{
                    console.log('message recieved');
                    console.log(msgObj);
                });
            });
        }
    });
});