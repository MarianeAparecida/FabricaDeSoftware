import React from "react";
import { StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export const Login_Styles = (theme : any)=>StyleSheet.create({
      container: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: theme.background,
      },
      login_box: {
            width: '90%',
            height: '45%',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            borderWidth: 1,
            borderColor: theme.placeholder,
            backgroundColor: theme.card,
            borderRadius: 10,
            marginTop: 'auto',
            marginBottom: 'auto',
            transform: [{ translateY: -88 }],
      },
      textos: {
            color: theme.text,
            alignSelf: 'flex-start',
            paddingHorizontal: '2%',
            fontSize: 16,
            fontWeight: 'normal',
      },
      input_box:{
            width: '90%',
            alignItems: 'center'
      },
      inputs: {
            width: '100%',
            height: 'auto',
            backgroundColor: theme.card,
      },
      acessar: {
            width: '90%',
            height: 50,
            backgroundColor: theme.primary,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto',
      },
      acessar_text: {
            color: COLORS.branco,
            fontSize: 18,
            fontWeight: 'bold',
      },
      gov_box_container: {
            width: '100%',
            position: 'absolute',
            bottom: 40,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
      },
      gov_box: {
            width: '90%',
            height: 50,
            borderWidth: 1,
            borderColor: theme.primary,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 'auto',
            alignSelf: 'center',            
      },
      links: {
            color: theme.primary,
            fontSize: 12,
            fontWeight: 'bold',
            paddingVertical: "3%"
      }
});
