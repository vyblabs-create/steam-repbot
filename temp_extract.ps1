 = 'https://steamcommunity.com/id/v3cna1998'  
if ( -match '/id/([/?]+)') { [1] } elseif ( -match '/profiles/([/?]+)') { [1] } else { 'UNKNOWN' }  
