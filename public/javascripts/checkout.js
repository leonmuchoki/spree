var addresses = new Array;
var state_mapper; 
//On page load
$(function() {
  get_states();
  if($('input#retrieve_addresses').length == 1) {
    get_addresses(1);
  } else {
    shift_to_region(regions[0]);    
  } 
  $('#checkout_same_address').sameAddress();
  $('span#bcountry select').change(function() { update_state('b'); });
  $('span#scountry select').change(function() { update_state('s'); });
  
  // hook up the continue buttons for each section
  for(var i=0; i < regions.length; i++) {     
    var section = regions[i];                          
    $('#continue_' + section).click(function() { eval( "continue_button(this);") });   
    
    // enter key should be same as continue button (don't submit form though)
    $('#' + section + ' input').bind("keyup", section, function(e) {
      if(e.keyCode == 13) {          
        continue_section(e.data);
      }
    });
  }
  // disable submit
  $(':submit').attr('disabled', 'disbled');
  
  // hookup the radio buttons for registration
  $('#choose_register').click(function() { $('div#new_user').show(); $('div#guest_user, div#existing_user').hide(); }).attr('checked', true);
  $('#choose_existing').click(function() { $('div#existing_user').show(); $('div#guest_user, div#new_user').hide(); });
  $('#choose_guest').click(function() { $('div#guest_user').show(); $('div#existing_user, div#new_user').hide(); });	
})

jQuery.fn.sameAddress = function() {
  this.click(function() {
    if(!$(this).attr('checked')) {
      //Clear ship values?
      return;
    }
    $('input#hidden_sstate').val($('input#hidden_bstate').val());
    $("#billing input, #billing select").each(function() {
      $("#shipping #"+ $(this).attr('id').replace('bill', 'ship')).val($(this).val());
    })
    update_state('s');
  })
};

var initiate_address_book_fxnality = function() {
  if($('div#billing div.saved_addresses').length > 0) {
    $('div#billing div.saved_addresses input:first').attr('checked', 1);
    toggle_address_region('billing', 1);
    toggle_saved_address('billing');
  }
  if($('div#shipping div.saved_addresses').length > 0) {
    $('div#shipping div.saved_addresses input:first').attr('checked', 1); 
    toggle_address_region('shipping', 1); 
    toggle_saved_address('shipping');
  }
  $('input.saved_radio').click(function() {
    var region = $(this).parent().parent().attr('id');
    if($(this).parent().attr('class') == 'saved_addresses') {
      region = $(this).parent().parent().parent().attr('id');
    }
    toggle_address_region(region, $(this).val());
  });
  $('div.saved_addresses select').change(function() { toggle_saved_address($(this).attr('class')); });
};

var toggle_saved_address = function(region) {
  var address_id = $('div#' + region + ' div.saved_addresses select').val();
  $('div#' + region + ' div.saved_addresses span').html(addresses['address_' + address_id]);
};

var toggle_address_region = function(region, value) {
  if(value == 1) {
    $('div#' + region + ' div.inner p').hide();
    $('div#' + region + ' div.saved_addresses span').show();
    $('div#' + region + ' div.saved_addresses select').removeAttr('disabled');
  } else {
    $('div#' + region + ' div.inner p').show();
    $('div#' + region + ' div.saved_addresses span').hide();
    $('div#' + region + ' div.saved_addresses select').attr('disabled', true);
  }
};

//Initial state mapper on page load
var get_states = function() {
  $.getJSON('/states.js', function(json) {
    state_mapper = json;
    $('span#bcountry select').val($('input#hidden_bcountry').val());
    update_state('b');
    $('span#bstate :only-child').val($('input#hidden_bstate').val());
    $('span#scountry select').val($('input#hidden_scountry').val());
    update_state('s');
    $('span#sstate :only-child').val($('input#hidden_sstate').val());
  });
};

//Initial address loader
var get_addresses = function(on_page_load) {
  $.getJSON('/addresses.js', function(json) {
    if(json.addresses == '') {
      $('div.saved_addresses').hide();
      $('input.saved_radio').hide();
      $('label.saved_label').hide();
    } else {
      $.each(json.addresses, function(pos,id_nm) {
        address = id_nm.address;
        var address_display = address.firstname + ' ' + address.lastname + '<br />' + address.address1 + '<br />';
        if(address.address2 != '') {
          address_display += address.address2 + '<br />';
        }
        address_display += address.city + ', ' + address.state_id + ' ' + address.zipcode + '<br />';
        address_display += address.country_id + '<br />' + address.phone;
        addresses['address_' + address.id] = address_display;
        $('div#billing select:first').append($(document.createElement('option')).val(address.id).html(address.nickname));
        $('div#shipping select:first').append($(document.createElement('option')).val(address.id).html(address.nickname));
      });
      initiate_address_book_fxnality();
      $('div.saved_addresses').show();
      $('input.saved_radio').show();
      $('label.saved_label').show();  
    }
    if(on_page_load) shift_to_region(regions[0]);
  });
};

// replace the :only child of the parent with the given html, and transfer
//   {name,id} attributes over, returning the new child
var chg_state_input_element = function (parent, html) {
  var child = parent.find(':only-child');
  var name = child.attr('name');
  var id = child.attr('id');
  //Toggle back and forth between id and name
  if(html.attr('type') == 'text' && child.attr('type') != 'text') {
    name = name.replace('_id', '_name');
    id = id.replace('_id', '_name');
  } else if(html.attr('type') != 'text' && child.attr('type') == 'text') {
    name = name.replace('_name', '_id');
    id = id.replace('_name', '_id');
  }
  html.addClass('required')
      .attr('name', name)
      .attr('id',   id);
  child.remove();		// better as parent-relative?
  parent.append(html);
  return html;
};

// TODO: better as sibling dummy state ?
// Update the input method for address.state 
var update_state = function(region) {
  var country        = $('span#' + region + 'country :only-child').val();
  var states         = state_mapper[country];
  var hidden_element = $('input#hidden_' + region + 'state');

  var replacement;
  if(states) {
    // recreate state selection list
    replacement = $(document.createElement('select'));
    var states_with_blank = [["",""]].concat(states);
    $.each(states_with_blank, function(pos,id_nm) {
      var opt = $(document.createElement('option'))
                .attr('value', id_nm[0])
                .html(id_nm[1]);
      replacement.append(opt);
      if (id_nm[0] == hidden_element.val()) { opt.attr('selected', 'true') }
        // set this directly IFF the old value is still valid
    });
  } else {
    // recreate an input box
    replacement = $(document.createElement('input'));
    if (! hidden_element.val().match(/^\d+$/)) { replacement.val(hidden_element.val()) }
  }

  chg_state_input_element($('span#' + region + 'state'), replacement);
  hidden_element.val(replacement.val());

  // callback to update val when form object is changed
  // This is only needed if we want to preserve state when someone refreshes the checkout page
  // Or... if someone changes between countries with no given states
  replacement.change(function() {
    $('input#hidden_' + region + 'state').val($(this).val());
  });
};       

var continue_button = function(button) {
  continue_section(button.id.substring(9));
};  

var continue_section = function(section) {
  // validate
  if (!validate_section(section)) { return; };
  // submit
  var success = eval("submit_" + section + "();");
  if (!success) { return; }
  // move to next section      
  for(var i=0; i<regions.length; i++) {
    if (regions[i] == section) {
      if (i == (regions.length - 1)) { break; };
      shift_to_region(regions[i+1]);
    }
  }  
};

var validate_section = function(region) {
  if($('div#' + region + ' div.saved_addresses select:child').length > 0 && $('div#' + region + ' input.saved_radio:first').attr('checked')) {
    return true;
  }
  var validator = $('form#checkout_form').validate();
  var valid = true;
  $('div#' + region + ' input:visible, div#' + region + ' select:visible, div#' + region + ' textarea:visible').each(function() {
    if(!validator.element(this)) {
      valid = false;
    }
  });
  return valid;
};

var shift_to_region = function(active) {
  if (active != regions[0]) { $('div#flash-errors').remove(); }
  var found = 0;
  for(var i=0; i<regions.length; i++) {
    if(!found) {
      if(active == regions[i]) {
        $('div#' + regions[i] + ' h2').unbind('click').css('cursor', 'default');
        $('div#' + regions[i] + ' div.inner').show('fast');
        $('div#' + regions[i]).removeClass('disabled').removeClass('completed');
        found = 1;
      }
      else {
        $('div#' + regions[i] + ' h2').unbind('click').css('cursor', 'pointer').click(function() {shift_to_region($(this).parent().attr('id'));});
        $('div#' + regions[i] + ' div.inner').hide('fast');
        $('div#' + regions[i]).addClass('completed');
      }
    } else {
      $('div#' + regions[i] + ' h2').unbind('click').css('cursor', 'default');
      $('div#' + regions[i] + ' div.inner').hide('fast');
      $('div#' + regions[i]).addClass('disabled');
    }
  }                                                                         
  if (active == 'confirmation') {
    $("input#final_answer").attr("value", "yes");    
    $('#continue_confirmation').removeAttr('disabled', 'disabled'); 
    $('#post-final').removeAttr('disabled', 'disabled'); 
  } else {
    // indicates order is ready to be processed (as opposed to simply updated)
    $("input#final_answer").attr("value", "");
    // disable form submit
    $(':submit').attr('disabled', 'disbled'); 
  }
  return;
};

var submit_billing = function() {
  build_address('Billing Address', 'billing');
  return true;
};

var build_address = function(title, region_long) {
  var region = region_long.substring(0,1);
  var address = '<h3>' + title + '</h3>';
  if($('div#' + region_long + ' div.saved_addresses select:child').length > 0 && $('div#' + region_long + ' input.saved_radio:first').attr('checked')) {
    var address_id = $('div#' + region_long + ' div.saved_addresses select').val();
    address += addresses['address_' + address_id];
  }
  else {
    address += $('p#' + region + 'fname input').val() + ' ' + $('p#' + region + 'lname input').val() + '<br />';
    address += $('p#' + region + 'address input').val() + '<br />';
    if($('p#' + region + 'address2').val() != '') {
      address += $('p#' + region + 'address2').val() + '<br />';
    }
    address += $('p#' + region + 'city input').val() + ', ';
    if($('span#' + region + 'state input').length > 0) {
      address += $('span#' + region + 'state input').val();
    } else {
      address += $('span#' + region + 'state :selected').html();
    }
    address += ' ' + $('p#' + region + 'zip input').val() + '<br />';
    address += $('p#' + region + 'country :selected').html() + '<br />';
    address += $('p#' + region + 'phone input').val();
  }
  $('div#' + region + 'display').html(address);
  return;
};

var submit_shipping = function() {
  $('div#methods :child').remove();
  $('div#methods').append($(document.createElement('img')).attr('src', '/images/ajax_loader.gif').attr('id', 'shipping_loader'));
  // Save what we have so far and get the list of shipping methods via AJAX
  $.ajax({
    type: "POST",
    url: 'checkout',                                 
    beforeSend : function (xhr) {
      xhr.setRequestHeader('Accept-Encoding', 'identity');
    },      
    dataType: "json",
    data: $('#checkout_form').serialize(),
    success: function(json) {  
      update_shipping_methods(json.available_methods); 
    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      // TODO - put some real error handling in here
      $("#error").html(XMLHttpRequest.responseText); 
      return false;
    }
  });  
  build_address('Shipping Address', 'shipping');
  return true;
};
                     
var submit_shipping_method = function() {
  //TODO: Move to validate_section('shipping_method'), but must debug how to validate radio buttons
  var valid = false;
  $('div#methods :child input').each(function() {
    if($(this).attr('checked')) {
      valid = true;
    }
  });
  if(valid) {
    // Save what we have so far and get the updated order totals via AJAX
    $.ajax({
      type: "POST",
      url: 'checkout',                                 
      beforeSend : function (xhr) {
        xhr.setRequestHeader('Accept-Encoding', 'identity');
      },      
      dataType: "json",
      data: $('#checkout_form').serialize(),
      success: function(json) {  
        update_confirmation(json.order); 
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        // TODO - put some real error handling in here
        //$("#error").html(XMLHttpRequest.responseText);           
        return false;
      }
    });  
    return true;
  } else {
    var p = document.createElement('p');
    $(p).append($(document.createElement('label')).addClass('error').html('Please select a shipping method').css('width', '300px').css('top', '0px'));
    $('div#methods').append(p);
    return false;
  }
}; 

var update_shipping_methods = function(methods) {
  $(methods).each( function(i) {
    $('div$methods img#shipping_loader').remove();
    var p = document.createElement('p');
    var s = this.name + ' ' + this.rate;
    var i = $(document.createElement('input'))
                .attr('id', this.id)
                .attr('type', 'radio')
                .attr('name', 'method_id')
                .val(this.id)
                .click(function() { $('div#methods input').attr('checked', ''); $(this).attr('checked', 'checked'); });
    if($(methods).length == 1) {
      i.attr('checked', 'checked');
    }
    var l = $(document.createElement('label'))
                .attr('for', s)
                .html(s)
                .css('top', '-1px')
                .css('width', '300px');
    $('div#methods').append($(p).append(i).append(l));
  });
  $('div#methods input:first').attr('validate', 'required:true');
  return;
};                                     

var update_confirmation = function(order) {
  $('span#order_total').html(order.order_total);
  $('span#ship_amount').html(order.ship_amount);
  $('span#tax_amount').html(order.tax_amount);                                  
  $('span#ship_method').html(order.ship_method);                                    
};      

var submit_registration = function() {
  // no need to do any ajax, user is already logged in
  if ($('div#already_logged_in:hidden').size() == 0) return true;
  var register_method = $('input[name=choose_registration]:checked').val();
  
  $('div#registration_error').removeClass('error').html('');    

  if (register_method == 'existing') {
	ajax_login();
  }
  else if (register_method == 'register') {
	ajax_register();
  }
  return ($('div#registration_error:hidden').size() == 1);  
};

var ajax_login = function() {
  $.ajax({
	async: false,
    type: "POST",
    url: '/user_session',                                 
    beforeSend : function (xhr) {
      xhr.setRequestHeader('Accept-Encoding', 'identity');
    },      
    dataType: "json",
    data: $('#checkout_form').serialize(),
    success: function(result) {
      if (result) {
	    $('div#already_logged_in').show();
		$('div#register_or_guest').hide();
        get_addresses(0);
        // todo update login partial
      } else {
        registration_error("Invalid username or password.");
      };
    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      // TODO - put some real error handling in here
      $("#ajax_error").html(XMLHttpRequest.responseText);           
    }
  });  	
};

var ajax_register = function() {
  $.ajax({
		async: false,
    type: "POST",
    url: '/users',                                 
    beforeSend : function (xhr) {
      xhr.setRequestHeader('Accept-Encoding', 'identity');
    },      
    dataType: "json",
    data: $('#checkout_form').serialize(),
    success: function(result) {  
      if (result == true) {
				$('div#already_logged_in').show();
				$('div#register_or_guest').hide();
        // todo update login partial
      } else {                                         
        var error_msg = "Unable to register user";              
        for (var i=0; i < result.length; i++) {
          error_msg += "<br/>";
          error_msg += result[i][0] + ": " + result[i][1];
        }
        registration_error(error_msg);
      };
    },
    error: function (XMLHttpRequest, textStatus, errorThrown) {
      // TODO - put some real error handling in here
      $("#ajax_error").html(XMLHttpRequest.responseText);           
    }
  });  	
};

var registration_error = function(error_message) {
  $('div#registration_error').addClass('error').html(error_message);
};

var submit_payment = function() {             
  return true;
};    

var submit_confirmation = function() {  
  //$('form').submit();
  $('#post-final').click();
};
