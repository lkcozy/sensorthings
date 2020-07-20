psql -c 'drop database sensorthings;' -U postgres 2> /dev/null || :
psql -c 'create database sensorthings;' -U postgres 2> /dev/null || :
psql -c 'create extension postgis;' -U postgres sensorthings 2> /dev/null || :
