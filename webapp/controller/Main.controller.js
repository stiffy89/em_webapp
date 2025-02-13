sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML"
], (Controller, JSONModel, HTML, GridData) => {
    "use strict";

    return Controller.extend("emwebapp.controller.Main", {

        onInit() {
            $.ajax({
                url: "user-api/currentUser",
                method: "GET",
                async: false,
                success: function (result, status, xhr) {
                    Controller._userDetails = result;
                },
                error: function (xhr, status, error) {
                    console.log(error)
                }
            });

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

            let oModel = new JSONModel(oDemoData);
            let oView = this.getView();
            let oPage = oView.byId('page');
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
        }
    });
});